import { serverURL } from "../../services/FetchDjangoApiServices";
import { Grid } from "@mui/material";
import { useTheme } from '@mui/material/styles';
import UseMediaQuery from '@mui/material/useMediaQuery';

export default function Icons() {
    const theme = useTheme();
    const sm_matches = UseMediaQuery(theme.breakpoints.down('sm'));

    const iconSize = sm_matches ? '26px' : '34px';

    return (
        <Grid
            container
            spacing={sm_matches ? 1.5 : 4}
            justifyContent="center"
            alignItems="center"
            style={{ maxWidth: sm_matches ? 280 : 640, margin: '0 auto' }}
        >
            <Grid item xs={2} style={{ textAlign: 'center' }}>
                <img src={`${serverURL}/static/facebook.png`} alt="Facebook" style={{ width: iconSize, height: iconSize, objectFit: 'contain' }} />
            </Grid>
            <Grid item xs={2} style={{ textAlign: 'center' }}>
                <img src={`${serverURL}/static/instagram.png`} alt="Instagram" style={{ width: iconSize, height: iconSize, objectFit: 'contain' }} />
            </Grid>
            <Grid item xs={2} style={{ textAlign: 'center' }}>
                <img src={`${serverURL}/static/twitter.png`} alt="Twitter" style={{ width: iconSize, height: iconSize, objectFit: 'contain' }} />
            </Grid>
            <Grid item xs={2} style={{ textAlign: 'center' }}>
                <img src={`${serverURL}/static/paytm.png`} alt="Paytm" style={{ width: iconSize, height: iconSize, objectFit: 'contain' }} />
            </Grid>
            <Grid item xs={2} style={{ textAlign: 'center' }}>
                <img src={`${serverURL}/static/google-pay.png`} alt="Google Pay" style={{ width: iconSize, height: iconSize, objectFit: 'contain' }} />
            </Grid>
            <Grid item xs={2} style={{ textAlign: 'center' }}>
                <img src={`${serverURL}/static/visa.png`} alt="Visa" style={{ width: iconSize, height: iconSize, objectFit: 'contain' }} />
            </Grid>
        </Grid>
    );
}
