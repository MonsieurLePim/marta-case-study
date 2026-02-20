import { Container } from 'inversify';

import './src/lib/base-controller';
import './src/controllers';

import { TYPES } from './src/lib';

// Services
// import {
//     UserService,
//     UserServiceImpl,
//     PasswordManagerService,
//     PasswordManagerServiceImpl,
// } from './src/services';

// Repositories
// import { UserRepository, UserRepositoryImpl } from './src/repositories';

export const diContainer = new Container();

// diContainer.bind<PasswordManagerService>(TYPES.PasswordManagerService).to(PasswordManagerServiceImpl);
// diContainer.bind<UserRepository>(TYPES.UserRepository).to(UserRepositoryImpl);
// diContainer.bind<UserService>(TYPES.UserService).to(UserServiceImpl);
