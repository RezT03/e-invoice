const normalTemplate = require('../pdf_templates/normalTemplate');
const dotMatrixTemplate = require('../pdf_templates/dotMatrixTemplate');

module.exports = async function generatePDF(invoice, type) {
  if (type === 'dotmatrix') {
    return await dotMatrixTemplate(invoice);
  } else {
    return await normalTemplate(invoice);
  }
};