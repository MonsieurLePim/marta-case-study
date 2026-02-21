import { controller, httpGet, BaseHttpController, interfaces } from 'inversify-express-utils';

@controller('/health-check')
export abstract class BaseController extends BaseHttpController {
    // service health check
    @httpGet('/')
    public async healthCheck(): Promise<interfaces.IHttpActionResult> {
        return this.json({ message: 'Service is up and running' }, 200);
    }
}
