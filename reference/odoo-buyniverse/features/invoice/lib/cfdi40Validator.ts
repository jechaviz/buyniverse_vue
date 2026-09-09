import { Invoice, InvoiceLineItem } from '@/types';

export type ValidationErrorMap = Record<string, string[]>;

export interface ValidationResult {
    errors: ValidationErrorMap;
    warnings: ValidationErrorMap;
}

// RFC Regex for Persona Física y Moral
const rfcRegex = /^[A-Z&Ñ]{3,4}[0-9]{2}(0[1-9]|1[012])(0[1-9]|[12][0-9]|3[01])[A-Z0-9]{2}[0-9A]$/;
const postalCodeRegex = /^\d{5}$/;

export const validateCfdi40 = (invoice: Partial<Invoice>, t: (key: string) => string): ValidationResult => {
    const errors: ValidationErrorMap = {};
    const warnings: ValidationErrorMap = {};

    const addError = (field: string, message: string) => {
        if (!errors[field]) errors[field] = [];
        errors[field].push(message);
    };

    // --- Issuer Validation ---
    if (!invoice.issuer?.name?.trim()) addError('issuer.name', t('pages.invoice.validation.fieldRequired'));
    if (!invoice.issuer?.rfc?.trim()) {
        addError('issuer.rfc', t('pages.invoice.validation.fieldRequired'));
    } else if (!rfcRegex.test(invoice.issuer.rfc)) {
        addError('issuer.rfc', t('pages.invoice.validation.rfcInvalid'));
    }
    if (!invoice.issuer?.taxRegime?.trim()) addError('issuer.taxRegime', t('pages.invoice.validation.fieldRequired'));
    if (!invoice.issuer?.postalCode?.trim()) {
        addError('issuer.postalCode', t('pages.invoice.validation.fieldRequired'));
    } else if (!postalCodeRegex.test(invoice.issuer.postalCode)) {
        addError('issuer.postalCode', t('pages.invoice.validation.postalCodeInvalid'));
    }

    // --- Receiver Validation ---
    if (!invoice.receiver?.name?.trim()) addError('receiver.name', t('pages.invoice.validation.fieldRequired'));
    if (!invoice.receiver?.rfc?.trim()) {
        addError('receiver.rfc', t('pages.invoice.validation.fieldRequired'));
    } else if (invoice.receiver.rfc !== 'XAXX010101000' && !rfcRegex.test(invoice.receiver.rfc)) { // Publico en general exception
        addError('receiver.rfc', t('pages.invoice.validation.rfcInvalid'));
    }
    if (!invoice.receiver?.taxRegime?.trim()) addError('receiver.taxRegime', t('pages.invoice.validation.fieldRequired'));
    if (!invoice.receiver?.postalCode?.trim()) {
        addError('receiver.postalCode', t('pages.invoice.validation.fieldRequired'));
    } else if (!postalCodeRegex.test(invoice.receiver.postalCode)) {
        addError('receiver.postalCode', t('pages.invoice.validation.postalCodeInvalid'));
    }
    
    // --- Invoice Details Validation ---
    if (!invoice.cfdiUse?.trim()) addError('cfdiUse', t('pages.invoice.validation.fieldRequired'));
    
    if (invoice.date) {
        const invoiceDate = new Date(invoice.date);
        const now = new Date();
        const seventyTwoHoursAgo = new Date(now.getTime() - (72 * 60 * 60 * 1000));

        if (invoiceDate > now) {
            addError('date', t('pages.invoice.validation.dateInFuture'));
        } else if (invoiceDate < seventyTwoHoursAgo) {
            addError('date', t('pages.invoice.validation.dateTooOld'));
        }
    } else {
        addError('date', t('pages.invoice.validation.fieldRequired'));
    }

    // --- Line Items (Conceptos) Validation ---
    if (!invoice.lineItems || invoice.lineItems.length === 0) {
        addError('lineItems', t('pages.invoice.validation.atLeastOneItem'));
    } else {
        invoice.lineItems.forEach((item, index) => {
            if (!item.description.trim()) addError(`lineItems[${index}].description`, t('pages.invoice.validation.fieldRequired'));
            if (item.quantity <= 0) addError(`lineItems[${index}].quantity`, t('pages.invoice.validation.greaterThanZero'));
            if (item.unitPrice <= 0) addError(`lineItems[${index}].unitPrice`, t('pages.invoice.validation.greaterThanZero'));
        });
    }

    return { errors, warnings };
};