/**
 * Template Editor Utility
 *
 * Generates form schemas from detected editable elements
 * and manages the form-to-preview synchronization
 */

import type { EditableElement } from './html-parser';

export type FormFieldType = 'text' | 'textarea' | 'url' | 'email';

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  value: string;
  placeholder?: string;
  maxLength?: number;
  rows?: number; // For textarea
  helpText?: string;
}

export interface FormSection {
  name: string;
  fields: FormField[];
}

export interface FormSchema {
  sections: FormSection[];
  flatFields: FormField[]; // All fields in a flat array for easier access
}

/**
 * Generate a form schema from detected editable elements
 */
export function generateFormSchema(
  elements: EditableElement[],
  groups: Record<string, EditableElement[]>
): FormSchema {
  const sections: FormSection[] = [];
  const flatFields: FormField[] = [];

  // Create sections from groups
  Object.entries(groups).forEach(([groupName, groupElements]) => {
    const fields = groupElements.map(elementToFormField);

    sections.push({
      name: groupName,
      fields,
    });

    flatFields.push(...fields);
  });

  // If no groups exist, create a single "All Fields" section
  if (sections.length === 0) {
    const fields = elements.map(elementToFormField);
    sections.push({
      name: 'All Fields',
      fields,
    });
    flatFields.push(...fields);
  }

  return {
    sections,
    flatFields,
  };
}

/**
 * Convert an EditableElement to a FormField
 */
function elementToFormField(element: EditableElement): FormField {
  const field: FormField = {
    id: element.id,
    type: determineFieldType(element),
    label: element.label,
    value: element.value,
  };

  // Add type-specific configuration
  switch (element.type) {
    case 'heading':
      field.maxLength = 100;
      field.helpText = 'Keep headings concise for better readability';
      break;

    case 'button':
      field.maxLength = 30;
      field.placeholder = 'Button text';
      field.helpText = 'Button text should be clear and action-oriented';
      break;

    case 'link':
      field.maxLength = 50;
      field.placeholder = 'Link text';
      break;

    case 'text':
      if ((element.characterCount || 0) > 80) {
        field.type = 'textarea';
        field.rows = Math.min(Math.ceil((element.characterCount || 0) / 80), 6);
        field.maxLength = 500;
      } else {
        field.maxLength = 200;
      }
      break;

    case 'image':
      if (element.attributeName === 'src') {
        field.type = 'url';
        field.placeholder = 'https://example.com/image.jpg';
        field.helpText = 'Enter a valid image URL';
      } else if (element.attributeName === 'alt') {
        field.maxLength = 100;
        field.placeholder = 'Describe the image';
        field.helpText = 'Alt text improves accessibility and SEO';
      }
      break;
  }

  return field;
}

/**
 * Determine the appropriate form field type for an element
 */
function determineFieldType(element: EditableElement): FormFieldType {
  // Images
  if (element.type === 'image' && element.attributeName === 'src') {
    return 'url';
  }

  // Long text gets textarea
  if (element.characterCount && element.characterCount > 80) {
    return 'textarea';
  }

  // Default to text input
  return 'text';
}

/**
 * Validate form field value
 */
export function validateFormField(field: FormField, value: string): string | null {
  // Check max length
  if (field.maxLength && value.length > field.maxLength) {
    return `Maximum length is ${field.maxLength} characters`;
  }

  // URL validation
  if (field.type === 'url' && value) {
    try {
      new URL(value);
    } catch {
      return 'Please enter a valid URL';
    }
  }

  // Email validation
  if (field.type === 'email' && value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Please enter a valid email address';
    }
  }

  return null; // Valid
}

/**
 * Export template data for saving
 */
export interface TemplateData {
  name: string;
  description?: string;
  originalHtml: string;
  annotatedHtml: string;
  currentHtml: string;
  schema: FormSchema;
  fieldValues: Record<string, string>;
}

export function prepareTemplateForSave(
  name: string,
  originalHtml: string,
  annotatedHtml: string,
  currentHtml: string,
  schema: FormSchema,
  fieldValues: Record<string, string>
): TemplateData {
  return {
    name,
    originalHtml,
    annotatedHtml,
    currentHtml,
    schema,
    fieldValues,
  };
}
