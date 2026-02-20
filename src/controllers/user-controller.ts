import { Request, Response } from 'express';
import { inject } from 'inversify';
import { controller, httpGet, httpPost, httpPut, request, response, BaseHttpController } from 'inversify-express-utils';

import { TYPES, authMiddleware, validateBody } from 'lib';
import { UserService } from 'services/user-service';
import { RegisterDto, LoginDto, UpdateProfileDto } from './user.dto';

@controller('/users')
export class UserController extends BaseHttpController {
    constructor(@inject(TYPES.UserService) private userService: UserService) {
        super();
    }

    @httpPost('/register', validateBody(RegisterDto))
    async register(@request() req: Request, @response() res: Response) {
        try {
            const user = await this.userService.register(req.body);
            const { password: _, ...safeUser } = user as any;
            return res.status(201).json(safeUser);
        } catch (err: any) {
            return res.status(400).json({ error: err.message });
        }
    }

    @httpPost('/login', validateBody(LoginDto))
    async login(@request() req: Request, @response() res: Response) {
        try {
            const { email, password } = req.body;
            const token = await this.userService.authenticate(email, password);
            return res.status(200).json({ token });
        } catch (err: any) {
            return res.status(401).json({ error: err.message });
        }
    }

    @httpGet('/profile', authMiddleware)
    async getProfile(@request() req: Request, @response() res: Response) {
        try {
            const user = await this.userService.getProfile(req.currentUser!.id);
            const { password: _, ...safeUser } = user as any;
            return res.status(200).json(safeUser);
        } catch (err: any) {
            return res.status(404).json({ error: err.message });
        }
    }

    @httpPut('/profile', authMiddleware, validateBody(UpdateProfileDto))
    async updateProfile(@request() req: Request, @response() res: Response) {
        try {
            const user = await this.userService.updateProfile(req.currentUser!.id, req.body);
            const { password: _, ...safeUser } = user as any;
            return res.status(200).json(safeUser);
        } catch (err: any) {
            return res.status(400).json({ error: err.message });
        }
    }
}
