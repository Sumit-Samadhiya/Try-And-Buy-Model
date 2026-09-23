import * as React from 'react';
import { CssVarsProvider, useColorScheme } from '@mui/joy/styles';
import Sheet from '@mui/joy/Sheet';
import CssBaseline from '@mui/joy/CssBaseline';
import Typography from '@mui/joy/Typography';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import Input from '@mui/joy/Input';
import Button from '@mui/joy/Button';
import Link from '@mui/joy/Link';
import { useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { postData } from '../../services/FetchDjangoApiServices';
import { useDispatch } from 'react-redux';
import { Link as RouterLink } from 'react-router-dom';

function ModeToggle() {
  const { mode, setMode } = useColorScheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <Button variant="soft">Change mode</Button>;
  }

  return (
    <Button
      variant="soft"
      onClick={() => {
        setMode(mode === 'light' ? 'dark' : 'light');
      }}
    >
      {mode === 'light' ? 'Turn dark' : 'Turn light'}
    </Button>
  );
}

function SignInDisplayContent() {
  const [mobileno, setMobileNo] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const handleSubmit = async () => {
    const body = { mobileno, password };

    try {
      const result = await postData('check_costumer_login', body);
      if (result && result.status) {
        const loggedUser = result.data[0];
        localStorage.setItem('sevenshades_user', JSON.stringify(loggedUser));
        dispatch({ type: 'ADD_USER', payLoad: [mobileno, loggedUser] });
        navigate(location.state?.redirectTo || '/home', { state: location.state?.checkoutState });
      } else {
        alert('Invalid login credentials');
      }
    } catch (error) {
      alert('An error occurred during login. Please try again later.');
    }
  };

  return (
    <main>
      <ModeToggle />
      <CssBaseline />
      <Sheet
        sx={{
          width: 300,
          mx: 'auto',
          my: 4,
          py: 3,
          px: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          borderRadius: 'sm',
          boxShadow: 'md',
        }}
        variant="outlined"
      >
        <div>
          <Typography level="h4" component="h1">
            <b>Welcome!</b>
          </Typography>
          <Typography level="body-sm">Sign in to continue.</Typography>
        </div>
        <FormControl>
          <FormLabel>Mobile Number</FormLabel>
          <Input name="mobileno" type="number" onChange={(e) => setMobileNo(e.target.value)} />
        </FormControl>
        <FormControl>
          <FormLabel>Password</FormLabel>
          <Input name="password" type="password" placeholder="password" onChange={(e) => setPassword(e.target.value)} />
        </FormControl>
        <Button onClick={handleSubmit} sx={{ mt: 1 }}>Log in</Button>
        <Typography endDecorator={<Link component={RouterLink} to="/signupdisplay" state={location.state}>Sign up</Link>} fontSize="sm" sx={{ alignSelf: 'center' }}>
          Don&apos;t have an account?
        </Typography>
      </Sheet>
    </main>
  );
}

export default function SignInDisplay() {
  return (
    <CssVarsProvider>
      <SignInDisplayContent />
    </CssVarsProvider>
  );
}
