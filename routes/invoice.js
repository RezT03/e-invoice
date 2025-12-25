const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');

router.get('/create', invoiceController.showCreateForm);
router.get('/:uuid', invoiceController.viewInvoice);
router.post('/create', invoiceController.createInvoice);
router.get('/create', invoiceController.showCreateForm);
router.post('/update/:uuid', invoiceController.updateInvoice);
router.post('/status/:uuid', invoiceController.updateStatus);
router.delete('/delete/:uuid', invoiceController.deleteInvoice);
router.get('/:uuid/pdf/:type', invoiceController.downloadPDF);

module.exports = router;