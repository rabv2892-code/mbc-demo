import { describe, expect, it } from "vitest";
import { LOGIN_LIMITS, isBucketLocked, nextFailure, throttleBucket } from "./login-throttle";
import { authenticateLogin, clientAddress, type LoginThrottlePort, type LoginUser } from "./login-flow";

const NOW = 1_700_000_000_000;

describe("limitation de connexion partagée", () => {
  it("ne stocke pas l'e-mail en clair dans la clé", () => {
    const bucket = throttleBucket("email", "Patron@Example.com");
    expect(bucket.startsWith("email:")).toBe(true);
    expect(bucket.toLowerCase()).not.toContain("patron");
    expect(throttleBucket("email", "patron@example.com")).toBe(bucket);
  });

  it("verrouille au cinquième échec et repart après la fenêtre", () => {
    let state = null;
    for (let i = 0; i < LOGIN_LIMITS.maxEmailFailures; i += 1) {
      state = nextFailure(state, NOW, LOGIN_LIMITS.maxEmailFailures);
    }
    expect(state?.failures).toBe(5);
    expect(isBucketLocked(state, NOW + 1)).toBe(true);
    expect(isBucketLocked(state, NOW + LOGIN_LIMITS.lockMs + 1)).toBe(false);
    const reset = nextFailure(state, NOW + LOGIN_LIMITS.windowMs, LOGIN_LIMITS.maxEmailFailures);
    expect(reset.failures).toBe(1);
    expect(reset.lockedUntilMs).toBeNull();
  });

  it("partage le compteur entre deux appelants du même état", async () => {
    const shared = new Map<string, ReturnType<typeof nextFailure>>();
    const port = sharedPort(shared);
    const findUser = async () => null;
    const verifyPassword = async () => false;
    const input = { email: "inconnu@societe.test", password: "mauvais-mot-de-passe", ip: "203.0.113.8", now: NOW };
    for (let i = 0; i < LOGIN_LIMITS.maxEmailFailures; i += 1) {
      const result = await authenticateLogin({ findUser, verifyPassword, throttle: port }, input);
      expect(result).toMatchObject({ ok: false, status: 401, message: "Identifiants invalides" });
    }
    const locked = await authenticateLogin({ findUser, verifyPassword, throttle: port }, input);
    expect(locked).toMatchObject({ ok: false, status: 429 });
  });
});

describe("réponse de connexion", () => {
  const user: LoginUser = {
    id: "user-1",
    email: "patron@societe.test",
    fullName: "Patron",
    role: "SUPER_ADMIN",
    isActive: true,
    passwordHash: "hash-reel",
  };

  it("compare toujours un hash, même si le compte n'existe pas", async () => {
    const seen: string[] = [];
    const result = await authenticateLogin(
      {
        findUser: async () => null,
        verifyPassword: async (_password, hash) => {
          seen.push(hash);
          return false;
        },
        throttle: openThrottle(),
      },
      { email: "absent@societe.test", password: "mot-de-passe-quelconque", ip: null, now: NOW },
    );
    expect(seen).toHaveLength(1);
    expect(seen[0]).not.toBe("hash-reel");
    expect(result).toEqual({ ok: false, status: 401, message: "Identifiants invalides" });
  });

  it("donne le même message pour un compte inactif ou un mauvais mot de passe", async () => {
    const inactive = await authenticateLogin(
      {
        findUser: async () => ({ ...user, isActive: false }),
        verifyPassword: async () => true,
        throttle: openThrottle(),
      },
      { email: user.email, password: "mot-de-passe-quelconque", ip: "127.0.0.1", now: NOW },
    );
    const wrong = await authenticateLogin(
      {
        findUser: async () => user,
        verifyPassword: async () => false,
        throttle: openThrottle(),
      },
      { email: user.email, password: "mot-de-passe-quelconque", ip: "127.0.0.1", now: NOW },
    );
    expect(inactive).toEqual(wrong);
    expect(JSON.stringify(inactive)).not.toContain(user.passwordHash);
  });

  it("accepte une adresse IP de proxy et refuse une valeur quelconque", () => {
    expect(clientAddress("203.0.113.10, 10.0.0.4")).toBe("203.0.113.10");
    expect(clientAddress("pas une ip")).toBeNull();
  });
});

function openThrottle(): LoginThrottlePort {
  return {
    isLocked: async () => false,
    recordFailure: async () => undefined,
    clearEmail: async () => undefined,
  };
}

function sharedPort(shared: Map<string, ReturnType<typeof nextFailure> | null>): LoginThrottlePort {
  return {
    async isLocked(email, ip, now) {
      const keys = [throttleBucket("email", email)];
      if (ip) keys.push(throttleBucket("ip", ip));
      return keys.some((key) => isBucketLocked(shared.get(key) ?? null, now));
    },
    async recordFailure(email, ip, now) {
      const emailKey = throttleBucket("email", email);
      shared.set(emailKey, nextFailure(shared.get(emailKey) ?? null, now, LOGIN_LIMITS.maxEmailFailures));
      if (ip) {
        const ipKey = throttleBucket("ip", ip);
        shared.set(ipKey, nextFailure(shared.get(ipKey) ?? null, now, LOGIN_LIMITS.maxIpFailures));
      }
    },
    async clearEmail(email) {
      shared.delete(throttleBucket("email", email));
    },
  };
}
