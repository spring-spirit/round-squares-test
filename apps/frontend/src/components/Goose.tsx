import { Box } from '@mui/material';

interface GooseProps {
  onClick?: () => void;
  disabled?: boolean;
}

export default function Goose({ onClick, disabled = false }: GooseProps) {
  return (
    <Box
      component="button"
      onClick={onClick}
      disabled={disabled}
      sx={{
        width: 200,
        height: 200,
        bgcolor: disabled ? 'grey.300' : 'primary.light',
        borderRadius: 2,
        border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s',
        fontSize: '4rem',
        '&:hover': disabled
          ? {}
          : { bgcolor: 'primary.main', transform: 'scale(1.05)' },
        '&:active': disabled ? {} : { transform: 'scale(0.95)' },
      }}
    >
      🦢
    </Box>
  );
}
