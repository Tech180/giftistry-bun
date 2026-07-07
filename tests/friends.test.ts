import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { app } from '../src/index';
import { createTestUser, cleanUpUser } from './helper';

describe("Friends System", () => {
  let userA: any;
  let userB: any;
  let userC: any;
  let requestId: string;

  beforeAll(async () => {
    const timestamp = Date.now();
    userA = await createTestUser(`friend_a_${timestamp}`, `friend_a_${timestamp}@example.com`);
    userB = await createTestUser(`friend_b_${timestamp}`, `friend_b_${timestamp}@example.com`);
    userC = await createTestUser(`friend_c_${timestamp}`, `friend_c_${timestamp}@example.com`);
  });

  afterAll(async () => {
    await cleanUpUser(userA.userId);
    await cleanUpUser(userB.userId);
    await cleanUpUser(userC.userId);
  });

  test("User A sends friend request to User B", async () => {
    const res = await app.handle(
      new Request("http://localhost/api/friends/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userA.token}`
        },
        body: JSON.stringify({ receiverId: userB.userId })
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    requestId = body.Result.Id;
    expect(body.Result.Status).toBe("pending");
  });

  test("User B accepts friend request", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/friends/requests/${requestId}/accept`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${userB.token}`
        }
      })
    );
    expect(res.status).toBe(200);
  });

  test("Both users see each other in friends list", async () => {
    const resA = await app.handle(
      new Request("http://localhost/api/friends", {
        method: "GET",
        headers: { "Authorization": `Bearer ${userA.token}` }
      })
    );
    expect(resA.status).toBe(200);
    const bodyA = await resA.json() as any;
    expect(bodyA.Result.some((f: any) => f.UserId === userB.userId)).toBe(true);

    const resB = await app.handle(
      new Request("http://localhost/api/friends", {
        method: "GET",
        headers: { "Authorization": `Bearer ${userB.token}` }
      })
    );
    expect(resB.status).toBe(200);
    const bodyB = await resB.json() as any;
    expect(bodyB.Result.some((f: any) => f.UserId === userA.userId)).toBe(true);
  });

  test("User search finds users by username", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/users/search?q=${userC.username}`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${userA.token}` }
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.Result.some((u: any) => u.Id === userC.userId)).toBe(true);
  });

  test("User A unfriends User B", async () => {
    const res = await app.handle(
      new Request(`http://localhost/api/friends/${userB.userId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${userA.token}` }
      })
    );
    expect(res.status).toBe(200);

    const listRes = await app.handle(
      new Request("http://localhost/api/friends", {
        method: "GET",
        headers: { "Authorization": `Bearer ${userA.token}` }
      })
    );
    const listBody = await listRes.json() as any;
    expect(listBody.Result.some((f: any) => f.UserId === userB.userId)).toBe(false);
  });
});
