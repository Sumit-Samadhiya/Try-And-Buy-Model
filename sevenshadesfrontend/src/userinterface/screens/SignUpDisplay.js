import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useState } from 'react';
import { postData } from '../../services/FetchDjangoApiServices';
import { useLocation, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';

const defaultTheme = createTheme();

export default function SignUpDisplay() {
  const [mobileno, setMobileNo] = useState('');
  const [fname, setFName] = useState('');
  const [lname, setLName] = useState('');
  const [emailid, setEmailId] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState({});
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const handleError = (errormessage, label) => {
    setFormError((prev) => ({ ...prev, [label]: errormessage }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    let err = false;
    if (mobileno.length === 0) {
      handleError('This field is required', 'mobileno');
      err = true;
    }
    if (fname.length === 0) {
      handleError('This field is required', 'fname');
      err = true;
    }
    if (lname.length === 0) {
      handleError('This field is required', 'lname');
      err = true;
    }
    if (emailid.length === 0) {
      handleError('This field is required', 'emailid');
      err = true;
    }
    if (password.length === 0) {
      handleError('This field is required', 'password');
      err = true;
    }

    if (!err) {
      const formData = new FormData();
      formData.append('mobileno', mobileno);
      formData.append('fname', fname);
      formData.append('lname', lname);
      formData.append('emailid', emailid);
      formData.append('password', password);

      const result = await postData('signup_submit', formData);

      if (result && result.status) {
        Swal.fire({
          title: 'The Seven Shades',
          text: result.message,
          icon: 'success',
          toast: true,
        });

        const userObj = { mobileno, fname, lname, emailid };
        localStorage.setItem('sevenshades_user', JSON.stringify(userObj));
        dispatch({ type: 'ADD_USER', payLoad: [mobileno, userObj] });
        navigate('/signindisplay', { state: location.state });
      } else {
        Swal.fire({
          title: 'The Seven Shades',
          text: result?.message || 'Signup failed',
          icon: 'error',
          toast: true,
        });
      }
    }
  };

  return (
    <ThemeProvider theme={defaultTheme}>
      <Container component="main" maxWidth="xs">
        <CssBaseline />
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
            <LockOutlinedIcon />
          </Avatar>
          <Typography component="h1" variant="h5">
            Sign up
          </Typography>
          <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField error={!!formError.fname} helperText={formError.fname} onFocus={() => handleError(false, 'fname')} autoComplete="given-name" name="fname" required fullWidth id="firstName" label="First Name" autoFocus onChange={(e) => setFName(e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField error={!!formError.lname} helperText={formError.lname} onFocus={() => handleError(false, 'lname')} required fullWidth id="lastName" label="Last Name" name="lname" autoComplete="family-name" onChange={(e) => setLName(e.target.value)} />
              </Grid>
              <Grid item xs={12}>
                <TextField error={!!formError.mobileno} helperText={formError.mobileno} onFocus={() => handleError(false, 'mobileno')} required fullWidth id="mobileno" label="Mobile Number" name="mobileno" onChange={(e) => setMobileNo(e.target.value)} />
              </Grid>
              <Grid item xs={12}>
                <TextField error={!!formError.emailid} helperText={formError.emailid} onFocus={() => handleError(false, 'emailid')} required fullWidth id="emailid" label="Email Address" name="emailid" autoComplete="email" onChange={(e) => setEmailId(e.target.value)} />
              </Grid>
              <Grid item xs={12}>
                <TextField error={!!formError.password} helperText={formError.password} onFocus={() => handleError(false, 'password')} required fullWidth name="password" label="Password" type="password" id="password" autoComplete="new-password" onChange={(e) => setPassword(e.target.value)} />
              </Grid>
            </Grid>
            <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
              Sign Up
            </Button>
            <Grid container justifyContent="flex-end">
              <Grid item>
                Already have an account? <Link to="/signindisplay" state={location.state}>Login</Link>
              </Grid>
            </Grid>
          </Box>
        </Box>
      </Container>
    </ThemeProvider>
  );
}
