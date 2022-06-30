import * as requestContext from 'request-context';

export const ContextMiddleware = requestContext.middleware('request');
