import { Request, Response } from 'express';
import { inject } from 'inversify';
import { controller, httpGet, httpPost, httpPut, request, response, BaseHttpController } from 'inversify-express-utils';

import { TYPES, authMiddleware } from 'lib';
import { UserService } from 'services/user-service';

@controller('/users')
export class UserController extends BaseHttpController {
    constructor(@inject(TYPES.UserService) private userService: UserService) {
        super();
    }

    @httpPost('/register')
    async register(@request() _req: Request, @response() res: Response) {
        res.status(501).json({ error: 'Not implemented' });
    }

    @httpPost('/login')
    async login(@request() _req: Request, @response() res: Response) {
        res.status(501).json({ error: 'Not implemented' });
    }

    @httpGet('/profile', authMiddleware)
    async getProfile(@request() _req: Request, @response() res: Response) {
        res.status(501).json({ error: 'Not implemented' });
    }

    @httpPut('/profile', authMiddleware)
    async updateProfile(@request() _req: Request, @response() res: Response) {
        res.status(501).json({ error: 'Not implemented' });
    }
}
