import { Stack, Typography } from '@mui/material';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';

export default function Icons() {
    return <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
        <PaymentsOutlinedIcon aria-hidden="true" />
        <Typography>Cash on Delivery &middot; Pay after your trial</Typography>
    </Stack>;
}
