import styles from './AccountPreview.module.css';

type AccountPreviewProps = Readonly<{
  accountName: string;
}>;

export function AccountPreview({ accountName }: AccountPreviewProps) {
  return (
    <section className={styles.panel} aria-labelledby="account-preview-heading">
      <h1 className={styles.heading} id="account-preview-heading">
        {accountName}
      </h1>
      <p className={styles.description}>Read-only preview with sample data.</p>
    </section>
  );
}
