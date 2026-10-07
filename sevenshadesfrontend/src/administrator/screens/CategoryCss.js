import { makeStyles } from "@mui/styles";

export const useStyles = makeStyles(() => ({
  root: {
    display: 'flex',
    justifyContent: 'center',
    width: '100%',
    minHeight: 'auto',
    padding: '12px 4px',
    boxSizing: 'border-box',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  box: {
    width: '100%',
    maxWidth: 680,
    backgroundColor: '#ffffff',
    height: 'auto',
    borderRadius: 16,
    padding: 24,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
    border: '1px solid #e2e8f0',
    marginTop: 12,
    marginBottom: 24,
    boxSizing: 'border-box',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    '@media (max-width: 600px)': {
      width: '100%',
      padding: '16px 12px',
      marginTop: 4,
      marginBottom: 12,
      borderRadius: 12,
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)'
    }
  },
  display_root: {
    display: 'block',
    width: '100%',
    minHeight: 'auto',
    padding: '8px 0',
    boxSizing: 'border-box',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  display_box: {
    width: '100%',
    maxWidth: 1400,
    backgroundColor: '#ffffff',
    height: 'auto',
    borderRadius: 16,
    padding: 0,
    margin: '0 auto 24px auto',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
    border: '1px solid #e2e8f0',
    overflowX: 'auto',
    boxSizing: 'border-box',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    '@media (max-width: 600px)': {
      width: '100%',
      borderRadius: 12,
      border: '1px solid #e2e8f0',
      boxShadow: 'none',
      margin: '0 0 16px 0'
    }
  }
}));


