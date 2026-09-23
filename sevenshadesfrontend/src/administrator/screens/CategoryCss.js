import { makeStyles } from "@mui/styles";

export const useStyles = makeStyles(() => ({
  root: {
    display: 'flex',
    backgroundColor: '#f1f2f6',
    justifyContent: "center",
    
    width: '100%',
    height: '100vh',
    fontFamily:'Kanit'
  },
  box: {
    width: '60%',
    backgroundColor: '#fff',
    height: 'auto',
    borderRadius: 15, 
    padding: 10,
    fontFamily:'Kanit',
    marginTop:'10%'
  },
  display_root: {
    display: 'flex',
    backgroundColor: '#f1f2f6',
    justifyContent: "center",
    alignItems: 'center',
    width: '100%',
    height: '100vh',
    fontFamily:'Kanit'
  },
  display_box: {
    width: '60%',
    backgroundColor: '#fff',
    height: 'auto',
    borderRadius: 15, 
    padding: 10,
    fontFamily:'Kanit',
    

  }
}));


