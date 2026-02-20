declare namespace Express {
    interface Request {
        currentUser?: {
            id: string;
            email: string;
        };
    }
}
