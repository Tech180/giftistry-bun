import { Elysia } from 'elysia';
import { PostgresUserRepository } from './infrastructure/postgres-user.repository';
import { SignupUseCase } from './application/signup.use-case';
import { LoginUseCase } from './application/login.use-case';
import { UpdateProfileUseCase } from './application/update-profile.use-case';
import { UserPreviewUseCase } from './application/user-preview.use-case';
import { authRoutes } from './presentation/auth.routes';

const userRepo = new PostgresUserRepository();

const signupUseCase = new SignupUseCase(userRepo);
const loginUseCase = new LoginUseCase(userRepo);
const updateProfileUseCase = new UpdateProfileUseCase(userRepo);
const userPreviewUseCase = new UserPreviewUseCase(userRepo);

export const authModule = new Elysia()
  .use(authRoutes({
    signup: signupUseCase,
    login: loginUseCase,
    updateProfile: updateProfileUseCase,
    userPreview: userPreviewUseCase,
  }));
export { authMiddleware } from './presentation/auth.routes';
export { userRepo as sharedPostgresUserRepository };
