const express = require('express');
const router = express.Router();
const activitiesController = require('../controllers/activitiesController');

router.get('/', activitiesController.getActivities);
// Строго до '/:id', иначе параметр перехватит слово "types"
router.get('/types', activitiesController.getTypes);
router.get('/:id', activitiesController.getActivityById);
router.post('/', activitiesController.createActivity);
router.put('/:id', activitiesController.updateActivity);
router.delete('/:id', activitiesController.deleteActivity);

module.exports = router;
