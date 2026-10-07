import imageUrl from '../../services/imageUrl';
import MaterialTable from "@material-table/core";
import { useStyles } from "./CategoryCss";
import { useEffect,useState } from "react";
import TitleComponent from "../components/admin/TitleComponent";
import Swal from "sweetalert2";
import {
  FormControl,
  FormHelperText,
  InputLabel,
  Select,
  MenuItem,
  Button,
  TextField,
  Avatar,
  Box,
  Chip,
  Typography,
  Grid,
} from "@mui/material";
import { getData, postData } from "../../services/FetchDjangoApiServices";
import Dialog from '@mui/material/Dialog';
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";


export default function DisplayAllSubCategory(){
    var classes=useStyles()
    const [open,setOpen]=useState(false)
    const [mySubCategoryList,setMySubCategoryList]=useState([])

    const [id,setId]=useState('')
    const [mainCategoryId,setMainCategoryId]=useState('')
   const [subCategoryName,setSubCategoryName]=useState('')
    const [icon,setIcon]=useState({file:'icon1.png',bytes:''})
    const [formError,setFormError]=useState({icon:false})
    const [btnStatus,setBtnStatus]=useState(true)
    const [tempIcon,setTempIcon]=useState('')
  
    const [mainCategoryList,setMainCategoryList]=useState([])


    const fetchAllMainCategory=async()=>{
      var result=await getData('maincategory_list')
      setMainCategoryList(result.data)
    }
    const fillMainCategory=()=>{
      return mainCategoryList.map((item)=>{
        return <MenuItem value={item.id}>{item.maincategoryname}</MenuItem>
      })
    }
    useEffect(function(){
      fetchAllMainCategory()
    },[])



    const handleOpenDialog=(rowData)=>{
        setId(rowData.id)
        setMainCategoryId(rowData.maincategoryid.id)
        setSubCategoryName(rowData.subcategoryname)
        setIcon({file:imageUrl(rowData.icon),bytes:''})
        setTempIcon(imageUrl(rowData.icon))
        setOpen(true)
    }
    const handleClose=()=>{
        setOpen(false)
      }
      const handleChange=(event)=>{
         
        setIcon({file:URL.createObjectURL(event.target.files[0]),bytes:event.target.files[0]})
        handleError(false,"icon")
        setBtnStatus(false)
        
  }
        const handleDeleteData=(rowData)=>{
            Swal.fire({
              title:"Do you want to delete data?",
              showDenyButton:true,
              
              confirmButtonText:'Delete',
              denyButtonText:'Do not delete'
      
            }).then(async(result)=>{
              if(result.isConfirmed){
                var body={id:rowData.id}
            var deleteResult=await postData('deletemysubcategorydata',body)
            if(deleteResult.status)
            {
              Swal.fire("Deleted..", "","success" ) 
              
            } else { Swal.fire("Cannot delete", deleteResult.message || "This record is still in use.", "error"); }
            fetchAllSubCategory()
                
              }
              else if (result.isDenied){
                Swal.fire("Not Deleted")
              }
      
            });
            
          }

          const handleCancel=()=>{
            setBtnStatus(true)
            setIcon({file:tempIcon,bytes:''})
          
          }
          const handleEditIcon=async()=>{
            var formData=new FormData()
               formData.append('id',id)
               formData.append('icon',icon.bytes)
               var result=await postData('editmysubcategory_icon',formData)
               if(result.status)
               {
                Swal.fire({
                  title:"The Seven Shades",
                  text:result.message,
                  icon:"success",
                  toast:true,
                })
               }
               else{
                Swal.fire({
                  title:"The Seven Shades",
                  text:result.message,
                  icon:"error",
                  toast:true,
                })
               }
               fetchAllSubCategory()
               setBtnStatus(true)
          }

          const handleError=(errormessage,label)=>{
            setFormError((prev)=>({...prev,[label]:errormessage })
        
          )}
    useEffect(function(){
        fetchAllSubCategory() 
      },[])
      const fetchAllSubCategory = async () => {
        try {
            var result = await getData('mysubcategory_list');
            if (result && result.data) {
                setMySubCategoryList(result.data);
            } else {
                // Handle case where result or result.data is null/undefined
                console.error('Error: Received null or undefined response from server');
            }
        } catch (error) {
            // Handle any errors that occurred during the request
            console.error('Error fetching main category data:', error);
        }
    };
    function listAllCategory() {
      return (
        <Box sx={{ width: '100%', overflowX: 'auto' }}>
          <MaterialTable
            title={
              <TitleComponent
                title="All Subcategories"
                link="/admindashboard/subcategory"
                buttonText="Add New Subcategory"
              />
            }
            columns={[
              {
                title: 'ID',
                field: 'id',
                width: 80,
                render: (row) => (
                  <Chip size="small" label={`#${row.id}`} sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }} />
                ),
              },
              {
                title: 'Icon',
                field: 'icon',
                width: 90,
                render: (row) => (
                  <Avatar
                    src={imageUrl(row.icon)}
                    alt={row.subcategoryname || "Subcategory"}
                    variant="rounded"
                    sx={{ width: 44, height: 44, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', p: 0.5 }}
                  />
                ),
              },
              {
                title: 'Subcategory Name',
                field: 'subcategoryname',
                render: (row) => (
                  <Typography sx={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>
                    {row.subcategoryname}
                  </Typography>
                ),
              },
              {
                title: 'Parent Category',
                render: (rowData) => (
                  <Chip
                    size="small"
                    color="primary"
                    variant="outlined"
                    label={rowData.maincategoryid?.maincategoryname || `ID #${rowData.maincategoryid?.id || rowData.maincategoryid}`}
                    sx={{ fontWeight: 600, borderColor: '#064e3b', color: '#064e3b' }}
                  />
                ),
              },
            ]}
            data={mySubCategoryList}
            options={{
              search: true,
              paging: true,
              pageSize: 10,
              pageSizeOptions: [10, 25, 50],
              headerStyle: {
                backgroundColor: '#f8fafc',
                color: '#1e293b',
                fontWeight: 800,
                fontSize: 13,
                borderBottom: '2px solid #e2e8f0',
              },
              rowStyle: {
                borderBottom: '1px solid #f1f5f9',
              },
            }}
            actions={[
              {
                icon: 'edit',
                tooltip: 'Edit Subcategory',
                onClick: (event, rowData) => handleOpenDialog(rowData),
              },
              {
                icon: 'delete',
                tooltip: 'Remove Subcategory',
                onClick: (event, rowData) => handleDeleteData(rowData),
              },
            ]}
          />
        </Box>
      );
    }

    const handleEditData = async () => {
      var body = { id: id, subcategoryname: subCategoryName, maincategoryid: mainCategoryId };
      var result = await postData('editmysubcategory_data', body);
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
      } else {
        Swal.fire({
          title: "The Seven Shades",
          text: result.message,
          icon: "error",
          toast: true,
          timer: 3000,
          position: "top-end",
          showConfirmButton: false,
        });
      }
      fetchAllSubCategory();
    };

    const showCategoryDialog = () => {
      return (
        <Dialog
          open={open}
          onClose={handleClose}
          fullWidth
          maxWidth="sm"
          PaperProps={{
            sx: { borderRadius: 3, p: { xs: 0.5, sm: 1.5 } },
          }}
        >
          <DialogTitle sx={{ pb: 1 }}>
            <TitleComponent title="Update Subcategory" />
          </DialogTitle>
          <DialogContent dividers sx={{ borderBottom: '1px solid #f1f5f9' }}>
            <Box sx={{ py: 1 }}>
              <Grid container spacing={{ xs: 2, sm: 2.5 }}>
                <Grid item xs={12}>
                  <FormControl fullWidth error={Boolean(formError.maincategoryid)}>
                    <InputLabel id="edit-parent-category-label">Parent Main Category</InputLabel>
                    <Select
                      labelId="edit-parent-category-label"
                      label="Parent Main Category"
                      onFocus={() => handleError('', 'maincategoryid')}
                      value={mainCategoryId}
                      onChange={(event) => setMainCategoryId(event.target.value)}
                    >
                      <MenuItem value="" disabled>
                        <em>Select Category</em>
                      </MenuItem>
                      {fillMainCategory()}
                    </Select>
                    {formError.maincategoryid && (
                      <FormHelperText>{formError.maincategoryid}</FormHelperText>
                    )}
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    value={subCategoryName}
                    error={Boolean(formError.subcategoryname)}
                    helperText={formError.subcategoryname}
                    onFocus={() => handleError(false, 'subcategoryname')}
                    onChange={(event) => setSubCategoryName(event.target.value)}
                    fullWidth
                    label="Subcategory Name"
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
                  {btnStatus ? (
                    <div>
                      <Button
                        fullWidth
                        variant="outlined"
                        component="label"
                        sx={{
                          py: 1.2,
                          borderStyle: 'dashed',
                          borderWidth: 2,
                          borderColor: formError.icon ? '#d32f2f' : '#cbd5e1',
                          color: '#064e3b',
                          bgcolor: '#f8fafc',
                        }}
                      >
                        Change Subcategory Icon
                        <input type="file" hidden accept="image/*" onChange={handleChange} />
                      </Button>
                      {formError.icon && (
                        <Typography variant="caption" sx={{ color: '#d32f2f', mt: 0.5, display: 'block' }}>
                          {formError.icon}
                        </Typography>
                      )}
                    </div>
                  ) : (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={handleEditIcon}
                        sx={{ bgcolor: '#064e3b', color: '#fff', '&:hover': { bgcolor: '#047857' } }}
                      >
                        Save Icon
                      </Button>
                      <Button variant="outlined" size="small" onClick={handleCancel}>
                        Cancel
                      </Button>
                    </Box>
                  )}
                </Grid>

                <Grid
                  item
                  xs={12}
                  sm={5}
                  sx={{ display: 'flex', justifyContent: { xs: 'flex-start', sm: 'center' }, alignItems: 'center' }}
                >
                  <Box sx={{ textAlign: 'center' }}>
                    <Avatar
                      alt="Icon"
                      variant="rounded"
                      src={icon.file}
                      sx={{
                        width: { xs: 64, sm: 78 },
                        height: { xs: 64, sm: 78 },
                        border: '1px solid #e2e8f0',
                        bgcolor: '#f8fafc',
                        p: 0.5,
                      }}
                    />
                    <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mt: 0.5 }}>
                      Preview
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button variant="outlined" onClick={handleClose} sx={{ color: '#64748b' }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleEditData}
              sx={{ bgcolor: '#064e3b', color: '#fff', fontWeight: 700, '&:hover': { bgcolor: '#047857' } }}
            >
              Save Changes
            </Button>
          </DialogActions>
        </Dialog>
      );
    };

    return (
      <div className={classes.display_root}>
        <div className={classes.display_box}>
          {listAllCategory()}
        </div>
        {showCategoryDialog()}
      </div>
    );
}
