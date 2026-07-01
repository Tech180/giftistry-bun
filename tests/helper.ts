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
            username,
            email,
            password: testPassword
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

export async function createTestWishlist(token: string, title: string, expiresAt: string | null = null, category = "generic", revealSuggestions = true) {
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
            title,
            expiresAt,
            allowGroupFunds: true,
            category,
            revealSuggestions
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

export async function shareTestWishlist(token: string, listId: string, email: string, role: string) {
  const res = await app.handle(
    new Request(`http://localhost/api/wishlists/${listId}/shares`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        Giftistry: {
          Lists: {
            email,
            role
          }
        }
      }),
    })
  );
  if (res.status !== 200) {
    const text = await res.text();
    throw new Error(`Failed to share test wishlist: ${text}`);
  }
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
