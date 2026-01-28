'use client';

import { useState, useCallback } from 'react';
import type { FormSchema, FormField } from '@/app/lib/template-editor';
import { validateFormField } from '@/app/lib/template-editor';

interface TemplateFormEditorProps {
  schema: FormSchema;
  values: Record<string, string>;
  onChange: (fieldId: string, value: string) => void;
}

/**
 * TemplateFormEditor Component
 *
 * Dynamically generates a form based on the detected editable elements.
 * Organized into sections with validation and onBlur updates.
 */
export default function TemplateFormEditor({
  schema,
  values,
  onChange,
}: TemplateFormEditorProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Handle field change (updates local state immediately)
  const handleChange = useCallback(
    (fieldId: string, value: string) => {
      // Clear error when user starts typing
      if (errors[fieldId]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[fieldId];
          return next;
        });
      }

      onChange(fieldId, value);
    },
    [errors, onChange]
  );

  // Handle field blur (trigger validation and preview update)
  const handleBlur = useCallback(
    (field: FormField) => {
      setTouched((prev) => ({ ...prev, [field.id]: true }));

      // Validate field
      const error = validateFormField(field, values[field.id] || '');
      if (error) {
        setErrors((prev) => ({ ...prev, [field.id]: error }));
      }
    },
    [values]
  );

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Form Header */}
      <div className="border-b bg-gray-50 px-4 py-3">
        <h3 className="text-sm font-medium text-gray-900">Edit Content</h3>
        <p className="text-xs text-gray-500">
          Make changes below. Preview updates when you leave a field.
        </p>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-auto p-4">
        {schema.sections.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-gray-500">No editable elements detected.</p>
              <p className="mt-1 text-xs text-gray-400">
                Try loading a different template.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {schema.sections.map((section) => (
              <FormSection
                key={section.name}
                section={section}
                values={values}
                errors={errors}
                touched={touched}
                onChange={handleChange}
                onBlur={handleBlur}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * FormSection Component - Renders a group of related fields
 */
interface FormSectionProps {
  section: { name: string; fields: FormField[] };
  values: Record<string, string>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  onChange: (fieldId: string, value: string) => void;
  onBlur: (field: FormField) => void;
}

function FormSection({
  section,
  values,
  errors,
  touched,
  onChange,
  onBlur,
}: FormSectionProps) {
  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="border-b pb-2">
        <h4 className="text-sm font-semibold text-gray-800">{section.name}</h4>
      </div>

      {/* Section Fields */}
      <div className="space-y-4">
        {section.fields.map((field) => (
          <FormFieldInput
            key={field.id}
            field={field}
            value={values[field.id] || field.value}
            error={touched[field.id] ? errors[field.id] : undefined}
            onChange={onChange}
            onBlur={onBlur}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * FormFieldInput Component - Renders a single form field
 */
interface FormFieldInputProps {
  field: FormField;
  value: string;
  error?: string;
  onChange: (fieldId: string, value: string) => void;
  onBlur: (field: FormField) => void;
}

function FormFieldInput({
  field,
  value,
  error,
  onChange,
  onBlur,
}: FormFieldInputProps) {
  const inputBaseClasses =
    'w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2';
  const inputClasses = error
    ? `${inputBaseClasses} border-red-300 focus:border-red-500 focus:ring-red-500`
    : `${inputBaseClasses} border-gray-300 focus:border-blue-500 focus:ring-blue-500`;

  return (
    <div className="space-y-1">
      {/* Label */}
      <label htmlFor={field.id} className="block text-sm font-medium text-gray-700">
        {field.label}
        {field.maxLength && (
          <span className="ml-2 text-xs font-normal text-gray-500">
            ({value.length}/{field.maxLength})
          </span>
        )}
      </label>

      {/* Input Field */}
      {field.type === 'textarea' ? (
        <textarea
          id={field.id}
          value={value}
          onChange={(e) => onChange(field.id, e.target.value)}
          onBlur={() => onBlur(field)}
          placeholder={field.placeholder}
          maxLength={field.maxLength}
          rows={field.rows || 3}
          className={inputClasses}
        />
      ) : (
        <input
          id={field.id}
          type={field.type}
          value={value}
          onChange={(e) => onChange(field.id, e.target.value)}
          onBlur={() => onBlur(field)}
          placeholder={field.placeholder}
          maxLength={field.maxLength}
          className={inputClasses}
        />
      )}

      {/* Help Text or Error */}
      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : field.helpText ? (
        <p className="text-xs text-gray-500">{field.helpText}</p>
      ) : null}
    </div>
  );
}
