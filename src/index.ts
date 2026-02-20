import 'module-alias/register';
import 'reflect-metadata';
import dotenv from 'dotenv';
import { json } from 'body-parser';
import { InversifyExpressServer } from 'inversify-express-utils';

import { getDataSource } from './typeormconfig';
import { diContainer } from '../inversify.config';
import { TYPES } from './lib';

dotenv.config();

(async () => {
    try {
        const dataSource = getDataSource();
        await dataSource.initialize();
        diContainer.bind(TYPES.DB).toConstantValue(dataSource);

        const app = new InversifyExpressServer(diContainer, null, {
            rootPath: '/partner-app/api',
        });
        app.setConfig(app => {
            app.use(json());
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
