// This file is the entry point for the English translations.
// It imports all the individual translation modules and exports them
// as a single nested object that mirrors the file structure.

// Common
import common from '@/i18n/en/common';
import errors from '@/i18n/en/errors';

// Layout
import layout from '@/i18n/en/layout/index';

// Pages
import pages from '@/i18n/en/pages/index';

// Components
import components from '@/i18n/en/components/index';

// Shared
import shared from '@/i18n/en/shared/index';

export default {
    common,
    errors,
    layout,
    pages,
    components,
    shared
};
