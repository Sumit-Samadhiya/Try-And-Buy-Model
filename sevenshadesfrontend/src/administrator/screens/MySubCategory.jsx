import {
  FormControl,
  FormHelperText,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  TextField,
  Button,
  Avatar,
  Box,
  Typography,
  CircularProgress,
} from "@mui/material";
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import { useState, useEffect } from "react";
import { useStyles } from "./CategoryCss";
import TitleComponent from "../components/admin/TitleComponent";
import { postData, getData } from "../../services/FetchDjangoApiServices";
import Swal from "sweetalert2";
import iconimage from '../../images/icon.png';

export default function MySubCategory() {
  const classes = useStyles();

  const [icon, setIcon] = useState({ file: 'icon1.png', bytes: '', fileName: '' });
  const [mainCategoryid, setMainCategoryid] = useState('');
  const [subCategoryName, setSubCategoryName] = useState("");
  const [formError, setFormError] = useState({});
  const [mainCategoryList, setMainCategoryList] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAllMainCategory = async () => {
    try {
      const result = await getData('maincategory_list');
      if (result?.status && Array.isArray(result.data)) {
        setMainCategoryList(result.data);
      }
    } catch (error) {
      console.error('Error fetching category list:', error);
    }
  };

  useEffect(() => {
    fetchAllMainCategory();
  }, []);

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

  const handleReset = () => {
    setIcon({ file: 'icon1.png', bytes: '', fileName: '' });
    setMainCategoryid('');
    setSubCategoryName('');
    setFormError({});
  };

  const handleError = (errormessage, label) => {
    setFormError((prev) => ({ ...prev, [label]: errormessage }));
  };

  const handleClick = async () => {
    let err = false;
    if (!mainCategoryid || mainCategoryid === "Select Category") {
      handleError("Please select a parent category", "maincategoryid");
      err = true;
    }
    if (!subCategoryName.trim()) {
      handleError("This field is required", "subcategoryname");
      err = true;
    }
    if (!icon.bytes) {
      handleError("Please select a subcategory icon", "icon");
      err = true;
    }

    if (!err) {
      setLoading(true);
      const formData = new FormData();
      formData.append('maincategoryid', mainCategoryid);
      formData.append('subcategoryname', subCategoryName.trim());
      formData.append('icon', icon.bytes);
      const result = await postData('mysubcategory_submit', formData);
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
          text: result.message || "Failed to create subcategory",
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
              title="Add Subcategory"
              listicon={iconimage}
              link="/admindashboard/displayallsubcategory"
              buttonText="View All Subcategories"
            />
          </Grid>

          <Grid item xs={12}>
            <FormControl fullWidth error={Boolean(formError.maincategoryid)}>
              <InputLabel id="parent-category-label">Parent Main Category</InputLabel>
              <Select
                labelId="parent-category-label"
                label="Parent Main Category"
                value={mainCategoryid}
                onFocus={() => handleError('', 'maincategoryid')}
                onChange={(event) => setMainCategoryid(event.target.value)}
              >
                <MenuItem value="" disabled>
                  <em>Select Parent Category</em>
                </MenuItem>
                {mainCategoryList.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.maincategoryname}
                  </MenuItem>
                ))}
              </Select>
              {formError.maincategoryid && (
                <FormHelperText>{formError.maincategoryid}</FormHelperText>
              )}
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Subcategory Name"
              placeholder="e.g. Formal Shirts, Denim Jackets, Maxi Dresses"
              error={Boolean(formError.subcategoryname)}
              helperText={formError.subcategoryname}
              onFocus={() => handleError(false, 'subcategoryname')}
              value={subCategoryName}
              fullWidth
              onChange={(event) => setSubCategoryName(event.target.value)}
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
              {icon.fileName ? `Change Icon (${icon.fileName})` : "Upload Subcategory Icon"}
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
                alt="Subcategory Icon Preview"
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
              fullWidth
              variant="contained"
              disabled={loading}
              onClick={handleClick}
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SaveRoundedIcon />}
              sx={{
                bgcolor: '#064e3b',
                color: '#ffffff',
                py: 1.2,
                fontWeight: 700,
                '&:hover': { bgcolor: '#047857' },
              }}
            >
              {loading ? "Saving..." : "Submit Subcategory"}
            </Button>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Button
              fullWidth
              variant="outlined"
              onClick={handleReset}
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