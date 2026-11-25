import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { AccountPreview } from './AccountPreview';

it('renders the account name and identifies the preview as read-only', () => {
  const markup = renderToStaticMarkup(<AccountPreview accountName="Demo & preview" />);

  expect(markup).toContain('aria-labelledby="account-preview-heading"');
  expect(markup).toContain('id="account-preview-heading">Demo &amp; preview</h1>');
  expect(markup).toContain('Read-only preview with sample data.');
});
