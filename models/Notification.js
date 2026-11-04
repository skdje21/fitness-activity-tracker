const mongoose = require('mongoose');


const notificationSchema = new mongoose.Schema({

    type: { type: String, required: true },

    user: { type: String, required: true },

    text: { type: String, required: true },
}, { timestamps: true });  

module.exports = mongoose.model('Notification', notificationSchema);
