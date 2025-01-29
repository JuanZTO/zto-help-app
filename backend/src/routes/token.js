import { Router } from 'express';
import logger from '../../logger.js';
import tokenSchema from '../schemas/token.js';
import handleError from '../middlewares/errorHandle.js';
import DBRepository from '../repositories/redis.repository.js';
import { isExpired } from '../services/token.js';
import SubscriptionImp from '../implements/skio.imp.js';

const router = Router();
const dbRepository = new DBRepository();
const subscriptionImp = new SubscriptionImp();

/**
 *  @openapi
 *  /token/validate:
 *    post:
 *      tags:
 *        - Token
 *      description: Validate Token
 *      requestBody:
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                email:
 *                  type: string
 *                token:
 *                  type: string
 *                subscription:
 *                  type: string
 *      responses:
 *        200:
 *          description: Returns JSON message
 */
router.post('/validate', handleError(tokenSchema), async (req, res) => {
    try {
        const { email, token, subscription } = req.body;
        const objectToken = await dbRepository.getTokenByEmail(email);
        if (!objectToken || isExpired(objectToken.expireAt) || objectToken.token !== token)
            throw new Error('Email or Token Not Found');

        const subscriptionExists = await subscriptionImp.getSubscription(email, subscription);
        if (!subscriptionExists) throw new Error('It is not possible to cancel the subscription');

        const subscriptionCancelled = await subscriptionImp.cancelSubscription(subscription);
        if (!subscriptionCancelled) throw new Error('It is not possible to cancel the subscription');
        await dbRepository.deleteToken(email);

        res.json({message: 'Subscription successfully cancelled'})
    } catch (err) {
        console.log(err);
        logger.error(err.message);
        res.status(500).json({message: err.message})
    }
})

export default router;