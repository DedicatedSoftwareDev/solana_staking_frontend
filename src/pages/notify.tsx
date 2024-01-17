import { useSnackbar, VariantType } from 'notistack';
import { useCallback } from 'react';

export default function useNotify() {
  const { enqueueSnackbar } = useSnackbar();

  return useCallback(
    (variant: VariantType, message: string, signature?: string) => {
      enqueueSnackbar(
        <span>
          {message}
          {signature && (
            <a
              rel='noreferrer'
              href={`https://explorer.solana.com/tx/${signature ?? ''}?cluster=devnet`}
              target='_blank'>
              Transaction
            </a>
          )}
        </span>,
        { variant },
      );
    },
    [enqueueSnackbar],
  );
}
