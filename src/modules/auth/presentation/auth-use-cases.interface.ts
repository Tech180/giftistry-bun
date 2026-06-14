import type { SignupUseCase } from '../application/signup.use-case';
import type { LoginUseCase } from '../application/login.use-case';
import type { UpdateProfileUseCase } from '../application/update-profile.use-case';

export interface AuthUseCases {
  signup: SignupUseCase;
  login: LoginUseCase;
  updateProfile: UpdateProfileUseCase;
}
