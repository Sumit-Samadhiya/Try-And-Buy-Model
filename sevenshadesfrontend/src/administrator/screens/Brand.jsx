import { Grid, TextField, Button, Avatar, Box, Typography, CircularProgress } from "@mui/material";
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import { useState } from "react";
import { useStyles } from "./CategoryCss";
import TitleComponent from "../components/admin/TitleComponent";
import { postData } from "../../services/FetchDjangoApiServices";
import Swal from "sweetalert2";
import iconimage from '../../images/icon.png';

export default function Brand() {
  var classes = useStyles();
  const [brandName, setBrandName] = useState('');
  const [icon, setIcon] = useState({ file: 'icon1.png', bytes: '', fileName: '' });
  const [formError, setFormError] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setIcon({
        file: URL.createObjectURL(selectedFile),
        bytes: selectedFile,
        fileName: selectedFile.name,
      });
      handleError(false, "icon");
    }
  };

  const handleError = (errormessage, label) => {
    setFormError((prev) => ({ ...prev, [label]: errormessage }));
  };

  const handleReset = () => {
    setBrandName('');
    setIcon({ file: 'icon1.png', bytes: '', fileName: '' });
    setFormError({});
  };

  const handleClick = async () => {
    var err = false;
    if (!brandName.trim()) {
      handleError("This field is required", "brandname");
      err = true;
    }
    if (!icon.bytes) {
      handleError("Please select a brand icon", "icon");
      err = true;
    }
    if (!err) {
      setLoading(true);
      var formData = new FormData();
      formData.append('brandname', brandName.trim());
      formData.append('icon', icon.bytes);
      var result = await postData('brand_submit', formData);
      setLoading(false);

      if (result.status) {
        Swal.fire({
          title: "The Seven Shades",
          text: result.message,
          icon: "success",
          toast: true,
          timer: 3000,
          position: "top-end",
          showConfirmButton: false,
        });
        handleReset();
      } else {
        Swal.fire({
          title: "The Seven Shades",
          text: result.message || "Failed to create brand",
          icon: "error",
          toast: true,
          timer: 3000,
          position: "top-end",
          showConfirmButton: false,
        });
      }
    }
  };

  return (
    <div className={classes.root}>
      <div className={classes.box}>
        <Grid container spacing={{ xs: 2, sm: 2.5 }}>
          <Grid item xs={12}>
            <TitleComponent
              title="Add Brand"
              listicon={iconimage}
              link="/admindashboard/displayallbrand"
              buttonText="View All Brands"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              value={brandName}
              error={Boolean(formError.brandname)}
              helperText={formError.brandname}
              onFocus={() => handleError(false, 'brandname')}
              onChange={(event) => setBrandName(event.target.value)}
              fullWidth
              label="Brand Name"
              placeholder="e.g. Sabyasachi, Manyavar, Fabindia"
              variant="outlined"
            />
          </Grid>

          <Grid
            item
            xs={12}
            sm={7}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <Button
              fullWidth
              variant="outlined"
              component="label"
              startIcon={<CloudUploadRoundedIcon />}
              sx={{
                py: 1.4,
                borderStyle: 'dashed',
                borderWidth: 2,
                borderColor: formError.icon ? '#d32f2f' : '#cbd5e1',
                color: formError.icon ? '#d32f2f' : '#064e3b',
                bgcolor: '#f8fafc',
                '&:hover': {
                  borderColor: '#064e3b',
                  bgcolor: '#f1f5f9',
                },
              }}
            >
              {icon.fileName ? `Change Icon (${icon.fileName})` : "Upload Brand Icon"}
              <input type="file" hidden accept="image/*" onChange={handleChange} />
            </Button>
            {formError.icon && (
              <Typography variant="caption" sx={{ color: '#d32f2f', mt: 0.5, px: 0.5 }}>
                {formError.icon}
              </Typography>
            )}
            <Typography variant="caption" sx={{ color: '#64748b', mt: 0.5, px: 0.5 }}>
              Recommended: PNG or WebP with transparent background
            </Typography>
          </Grid>

          <Grid
            item
            xs={12}
            sm={5}
            sx={{
              display: 'flex',
              justifyContent: { xs: 'flex-start', sm: 'center' },
              alignItems: 'center',
            }}
          >
            <Box sx={{ textAlign: 'center' }}>
              <Avatar
                alt="Brand Icon Preview"
                variant="rounded"
                src={icon.file}
                sx={{
                  width: { xs: 64, sm: 84 },
                  height: { xs: 64, sm: 84 },
                  border: '1px solid #e2e8f0',
                  bgcolor: '#f8fafc',
                  p: 0.5,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}
              />
              <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mt: 0.5 }}>
                Preview
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Button
              onClick={handleClick}
              variant="contained"
              fullWidth
              disabled={loading}
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SaveRoundedIcon />}
              sx={{
                bgcolor: '#064e3b',
                color: '#ffffff',
                py: 1.2,
                fontWeight: 700,
                '&:hover': { bgcolor: '#047857' },
              }}
            >
              {loading ? "Saving..." : "Submit Brand"}
            </Button>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Button
              onClick={handleReset}
              variant="outlined"
              fullWidth
              startIcon={<RestartAltRoundedIcon />}
              sx={{
                py: 1.2,
                borderColor: '#cbd5e1',
                color: '#475569',
                fontWeight: 700,
                '&:hover': { borderColor: '#94a3b8', bgcolor: '#f1f5f9' },
              }}
            >
              Reset
            </Button>
          </Grid>
        </Grid>
      </div>
    </div>
  );
}


