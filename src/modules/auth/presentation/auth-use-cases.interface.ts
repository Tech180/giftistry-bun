import type { SignupUseCase } from '../application/signup.use-case';
import type { LoginUseCase } from '../application/login.use-case';
import type { UpdateProfileUseCase } from '../application/update-profile.use-case';
import type { UserPreviewUseCase } from '../application/user-preview.use-case';

export interface AuthUseCases {
  signup: SignupUseCase;
  login: LoginUseCase;
  updateProfile: UpdateProfileUseCase;
  userPreview: UserPreviewUseCase;
}
