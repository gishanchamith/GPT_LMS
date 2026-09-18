'use client';

import { useCallback, useState, type ChangeEvent, type FormEvent } from 'react';
import type { z } from 'zod';
import { fieldErrors, type FieldErrors } from '@lp/shared';
import { ApiRequestError } from '@/lib/api';

type FieldElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

// Form state validated by the same zod schema the API uses, so the rules can't drift.
// `Values` is the raw form state; `Output` is what the schema produces after parsing.
export function useForm<Values extends object, Output>(
  schema: z.ZodType<Output>,
  initialValues: Values,
) {
  const [values, setValues] = useState<Values>(initialValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const setField = useCallback(<K extends keyof Values>(name: K, value: Values[K]) => {
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((e) => {
      const key = String(name);
      if (!e[key]) return e;
      const { [key]: _removed, ...rest } = e;
      return rest;
    });
  }, []);

  // Spread onto text inputs and selects: <Input {...bind('email')} />
  const bind = <K extends keyof Values & string>(name: K) => ({
    id: name,
    name,
    value: String(values[name] ?? ''),
    onChange: (e: ChangeEvent<FieldElement>) => setField(name, e.target.value as Values[K]),
    error: errors[name],
  });

  // Validates, then runs `action(parsedValues)`. A failed request shows its message
  // above the form and any field errors from the API next to their inputs.
  const submit = (action: (data: Output) => Promise<void>) => async (event?: FormEvent) => {
    event?.preventDefault();
    setFormError('');
    const result = schema.safeParse(values);
    if (!result.success) {
      setErrors(fieldErrors(result.error));
      return;
    }
    setSubmitting(true);
    try {
      await action(result.data);
    } catch (err) {
      if (err instanceof ApiRequestError && err.errors) setErrors(err.errors);
      setFormError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return { values, setValues, errors, formError, setField, bind, submit, submitting };
}
