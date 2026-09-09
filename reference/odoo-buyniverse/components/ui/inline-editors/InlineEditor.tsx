import React from 'react';
import { EditConfig } from '../datatable/types';
import { InlineTextEditor } from './InlineTextEditor';
import { InlineNumberEditor } from './InlineNumberEditor';
import { InlineSelectEditor } from './InlineSelectEditor';
import { InlineSliderEditor } from './InlineSliderEditor';
import { InlineUserEditor } from './InlineUserEditor';
import { InlineTagsEditor } from './InlineTagsEditor';
import { InlineRatingEditor } from './InlineRatingEditor';
import { InlineMultiUserEditor } from './InlineMultiUserEditor';
import { InlineDateEditor } from './InlineDateEditor';
import { InlineEmailEditor } from './InlineEmailEditor';

interface InlineEditorProps {
  value: any;
  onSave: (value: any) => void;
  onCancel: () => void;
  editConfig: EditConfig;
}

export const InlineEditor: React.FC<InlineEditorProps> = ({ value, onSave, onCancel, editConfig }) => {
  switch (editConfig.type) {
    case 'number':
      return <InlineNumberEditor value={value} onSave={onSave} onCancel={onCancel} />;
    case 'select':
      return <InlineSelectEditor value={value} onSave={onSave} onCancel={onCancel} options={editConfig.options || []} />;
    case 'slider':
        return <InlineSliderEditor value={value} onSave={onSave} onCancel={onCancel} />;
    case 'user':
        return <InlineUserEditor value={value} onSave={onSave} onCancel={onCancel} />;
    case 'tags':
        return <InlineTagsEditor value={value} onSave={onSave} onCancel={onCancel} />;
    case 'rating':
        return <InlineRatingEditor value={value} onSave={onSave} onCancel={onCancel} />;
    case 'multi-user':
        return <InlineMultiUserEditor value={value} onSave={onSave} onCancel={onCancel} />;
    case 'date':
        return <InlineDateEditor value={value} onSave={onSave} onCancel={onCancel} />;
    case 'email':
        return <InlineEmailEditor value={value} onSave={onSave} onCancel={onCancel} />;
    case 'text':
    default:
      return <InlineTextEditor value={value} onSave={onSave} onCancel={onCancel} />;
  }
};