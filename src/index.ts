import 'module-alias/register';
import 'reflect-metadata';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { json } from 'body-parser';
import { InversifyExpressServer } from 'inversify-express-utils';
import swaggerUi from 'swagger-ui-express';
import { parse } from 'yaml';

import { getDataSource } from './typeormconfig';
import { diContainer } from '../inversify.config';
import { TYPES } from './lib';

dotenv.config();

const REQUIRED_ENV_VARS = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DATABASE_HOST', 'DATABASE_NAME', 'DATABASE_USER'] as const;
for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]) {
        console.error(`Missing required environment variable: ${key}`);
        process.exit(1);
    }
}

(async () => {
    try {
        const dataSource = getDataSource();
        await dataSource.initialize();
        diContainer.bind(TYPES.DB).toConstantValue(dataSource);

        const app = new InversifyExpressServer(diContainer, null, {
            rootPath: '/partner-app/api',
        });
        const swaggerDoc = parse(fs.readFileSync(path.join(__dirname, 'swagger.yaml'), 'utf8'));

        app.setConfig((app) => {
            app.use(json());
            // swagger-ui-express bundles its own @types/express, causing a type mismatch
            // with our project's version — cast to bypass the structural incompatibility.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            app.use('/docs', ...(swaggerUi.serve as any[]), swaggerUi.setup(swaggerDoc) as any);
        });

        const server = app.build();
        const PORT = process.env.PORT || 9000;

        server.listen(PORT, () => {
            console.log(`Server listening on port ${PORT}`);
        });
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
