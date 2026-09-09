// This file is the entry point for the Spanish translations.
// It imports all the individual translation modules and exports them
// as a single nested object that mirrors the file structure.

// Common
import common from '@/i18n/es/common';
import errors from '@/i18n/es/errors';

// Layout
import layout from '@/i18n/es/layout/index';

// Pages
import pages from '@/i18n/es/pages/index';

// Components
import components from '@/i18n/es/components/index';

// Shared
import shared from '@/i18n/es/shared/index';

export default {
    common,
    errors,
    layout,
    pages,
    components,
    shared
};
