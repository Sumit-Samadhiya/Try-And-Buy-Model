import { makeStyles } from "@mui/styles";
export const useStyles=makeStyles({
    root:
    {
        width:"auto",
        height:"100vh",
        background: "#fafafa",
        display:"flex",
        alignItems:"center",
        justifyContent:"center",


    },
    box:{
        width:"60%",
        height:"auto",
        borderRadius:10,
        background: "white",
        padding:15,
        boxShadow:"0 0 15px #222"
    },
    center:{
        display:'flex',
        justifyContent:'center',
        alignItems:"center"
    },
    leftBarStyle:{
        padding:5,
        display:"flex",
        flexDirection:"column",
        alignItems:"center",
        margin:10,
    },
    nameStyle:{
        fontFamily:"Kanit",
        fontSize:16,
        fontWeight:"bold",
        marginTop:5,
        marginBottom:2,
        color:"black"
    },
    phoneStyle:{
        fontFamily:"Kanit",
        fontSize:12,
        fontWeight:'bold',
        color:'#636e72'
    },
    emailStyle:{
        fontFamily:"Kanit",
        fontSize:12,
        fontWeight:'bold',
        color:'#636e72'
    },

})
