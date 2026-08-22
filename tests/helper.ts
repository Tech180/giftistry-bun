import { sql } from '../src/common/database/connection';
import { app } from '../src/index';

export const testPassword = "securepassword123";

export async function createTestUser(username: string, email: string) {
  const signupRes = await app.handle(
    new Request("http://localhost/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        Giftistry: {
          Auth: {
            Username: username,
            Email: email,
            Password: testPassword
          }
        }
      }),
    })
  );
  if (signupRes.status !== 200) {
    const text = await signupRes.text();
    throw new Error(`Failed to create test user: ${text}`);
  }
  const body = await signupRes.json() as any;
  const userId = body.Result.User.Id as string;
  const token = body.Result.Token as string;

  // Automatically verify email for testing purposes
  await sql`UPDATE users SET email_verified = TRUE WHERE id = ${userId}`;

  return {
    token,
    userId,
    email,
    username,
  };
}

export async function createTestWishlist(
  token: string,
  title: string,
  expiresAt: string | null = null,
  category = "generic",
  revealSuggestions = true,
  autoRollover = false
) {
  const res = await app.handle(
    new Request("http://localhost/api/wishlists", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        Giftistry: {
          Lists: {
            Title: title,
            ExpiresAt: expiresAt,
            AllowGroupFunds: true,
            Category: category,
            RevealSuggestions: revealSuggestions,
            AutoRollover: autoRollover,
          }
        }
      }),
    })
  );
  if (res.status !== 200) {
    const text = await res.text();
    throw new Error(`Failed to create test wishlist: ${text}`);
  }
  const body = await res.json() as any;
  return body.Result.Id as string;
}

export async function befriendUsers(
  requester: { token: string; userId: string },
  receiver: { token: string; userId: string },
) {
  const reqRes = await app.handle(
    new Request('http://localhost/api/friends/requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${requester.token}`,
      },
      body: JSON.stringify({
        Giftistry: {
          Friends: {
            ReceiverId: receiver.userId,
          },
        },
      }),
    }),
  );

  if (reqRes.status === 200) {
    const reqBody = (await reqRes.json()) as { Result: { Id: string } };
    const requestId = reqBody.Result.Id;

    const acceptRes = await app.handle(
      new Request(`http://localhost/api/friends/requests/${requestId}/accept`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${receiver.token}`,
        },
      }),
    );
    if (acceptRes.status !== 200) {
      const text = await acceptRes.text();
      throw new Error(`Failed to accept friend request: ${text}`);
    }
    return;
  }

  const reqText = await reqRes.text();
  if (reqRes.status === 400 && reqText.includes('already friends with this user')) {
    return;
  }

  throw new Error(`Failed to send friend request: ${reqText}`);
}

export async function bulkShareTestWishlist(
  token: string,
  listId: string,
  friendIds: string[],
  role: string,
) {
  const res = await app.handle(
    new Request(`http://localhost/api/wishlists/${listId}/shares/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        Giftistry: {
          Lists: {
            FriendIds: friendIds,
            Role: role,
          },
        },
      }),
    }),
  );
  if (res.status !== 200) {
    const text = await res.text();
    throw new Error(`Failed to bulk share test wishlist: ${text}`);
  }
}

export async function shareTestWishlist(
  owner: { token: string; userId: string },
  listId: string,
  friend: { token: string; userId: string },
  role: string,
) {
  await befriendUsers(owner, friend);
  await bulkShareTestWishlist(owner.token, listId, [friend.userId], role);
}

export async function cleanUpUser(userId: string) {
  if (userId) {
    await sql`DELETE FROM users WHERE id = ${userId}`;
  }
}

export async function cleanUpWishlist(listId: string) {
  if (listId) {
    await sql`DELETE FROM lists WHERE id = ${listId}`;
  }
}
