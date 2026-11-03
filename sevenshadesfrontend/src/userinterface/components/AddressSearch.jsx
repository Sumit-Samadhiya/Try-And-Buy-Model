import React, { useEffect, useState } from 'react';
import { Alert, Autocomplete, Box, CircularProgress, TextField, Typography } from '@mui/material';
import { lookupAddress } from '../../services/reverseGeocodeService';

export default function AddressSearch({ onSelect }) {
  const [text, setText] = useState('');
  const [options, setOptions] = useState([]);
  const [busy, setBusy] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    let active = true;
    setOptions([]);
    setBusy(false);
    if (text.trim().length < 3) return undefined;
    const timer = setTimeout(async () => {
      setBusy(true);
      const result = await lookupAddress({ mode: 'autocomplete', text: text.trim() });
      if (!active) return;
      setOptions(result.results || []);
      setUnavailable(!result.status);
      setBusy(false);
    }, 600);
    return () => { active = false; clearTimeout(timer); };
  }, [text]);
  return <Box sx={{ p: 2, bgcolor: '#f2f8f5' }}>
    <Autocomplete
      options={options} loading={busy} filterOptions={items => items}
      getOptionLabel={option => option.formattedAddress || option.city || ''}
      isOptionEqualToValue={(a, b) => a.latitude === b.latitude && a.longitude === b.longitude && a.formattedAddress === b.formattedAddress}
      onInputChange={(_, value, reason) => { if (reason === 'input' || reason === 'clear') setText(value); }}
      onChange={(_, value) => { if (value) onSelect(value); }}
      noOptionsText={text.length < 3 ? 'Type at least 3 characters' : unavailable ? 'Please enter your address manually' : 'No matches. Try a nearby landmark.'}
      renderInput={params => <TextField {...params} label="Search area, street or landmark" placeholder="e.g. Civil Lines, Jhansi" inputProps={{ ...params.inputProps, maxLength: 180 }}
        InputProps={{ ...params.InputProps, endAdornment: <>{busy && <CircularProgress size={18} />}{params.InputProps.endAdornment}</> }} />}
    />
    <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#52665d' }}>
      Search text and selected coordinates are sent to <a href="https://www.geoapify.com/" target="_blank" rel="noopener noreferrer">Geoapify</a> for address suggestions. Powered by Geoapify · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>.
    </Typography>
    {unavailable && <Alert severity="info" sx={{ mt: 1 }}>Address search is temporarily unavailable. Move the pin yourself or choose “Enter address manually”. Your saved addresses still work.</Alert>}
  </Box>;
}
