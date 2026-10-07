import { useNavigate } from "react-router-dom";
import { Box, Button, Typography } from "@mui/material";
import ListAltRoundedIcon from "@mui/icons-material/ListAltRounded";
import AddCircleOutlineRoundedIcon from "@mui/icons-material/AddCircleOutlineRounded";
import mainlogo from "../../../images/logo.png";

export default function TitleComponent({ title, listicon, link, buttonText, action }) {
  const navigate = useNavigate();

  const isListView = link && (link.includes('display') || link.includes('list'));
  const defaultLabel = buttonText || (isListView ? "View List" : "Add New");

  return (
    <Box
      sx={{
        display: 'flex',
        width: '100%',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 1.5,
        pb: 1.5,
        borderBottom: '1px solid #f1f5f9',
        mb: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, flex: 1 }}>
        <Box
          component="img"
          src={mainlogo}
          alt="DoorDrape"
          sx={{
            width: { xs: 34, sm: 40 },
            height: { xs: 34, sm: 40 },
            objectFit: 'contain',
            borderRadius: 1.5,
            flexShrink: 0,
          }}
        />
        <Typography
          variant="h6"
          component="h1"
          sx={{
            fontWeight: 800,
            color: '#0f172a',
            fontSize: { xs: '1.05rem', sm: '1.25rem' },
            lineHeight: 1.2,
            letterSpacing: -0.3,
            wordBreak: 'break-word',
          }}
        >
          {title}
        </Typography>
      </Box>

      {action ? (
        action
      ) : link ? (
        <Button
          variant="outlined"
          size="small"
          onClick={() => navigate(link)}
          startIcon={
            listicon ? (
              <Box
                component="img"
                src={listicon}
                alt=""
                sx={{ width: 18, height: 18, objectFit: 'contain' }}
              />
            ) : isListView ? (
              <ListAltRoundedIcon fontSize="small" />
            ) : (
              <AddCircleOutlineRoundedIcon fontSize="small" />
            )
          }
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: 2,
            px: { xs: 1.2, sm: 1.8 },
            py: 0.6,
            fontSize: { xs: 12, sm: 13 },
            borderColor: '#cbd5e1',
            color: '#064e3b',
            bgcolor: '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            '&:hover': {
              borderColor: '#064e3b',
              bgcolor: 'rgba(6, 78, 59, 0.05)',
            },
          }}
        >
          {defaultLabel}
        </Button>
      ) : listicon ? (
        <Box
          component="img"
          src={listicon}
          alt=""
          sx={{ width: 28, height: 28, objectFit: 'contain', opacity: 0.8 }}
        />
      ) : null}
    </Box>
  );
}

