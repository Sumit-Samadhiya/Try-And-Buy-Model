import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Chip,
    Grid,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    IconButton,
    Paper,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddLocationAltIcon from '@mui/icons-material/AddLocationAlt';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import { getData, postData } from '../../services/FetchDjangoApiServices';

export default function PincodeManager() {
    const [pincodes, setPincodes] = useState([]);
    const [zones, setZones] = useState([]);
    const [excluded, setExcluded] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: 'info' });

    // Quick Add Pincode State
    const [quickPin, setQuickPin] = useState('');
    const [quickZoneName, setQuickZoneName] = useState('Jhansi - Sadar & City Central');

    // Dialog state for adding/editing full Zone
    const [zoneDialogOpen, setZoneDialogOpen] = useState(false);
    const [currentZone, setCurrentZone] = useState({ id: null, zone_name: '', postcodes: '' });

    // Dialog state for Excluded Area
    const [excludedDialogOpen, setExcludedDialogOpen] = useState(false);
    const [currentExcluded, setCurrentExcluded] = useState({ area_name: '', postcode: '' });

    // Search query for pincodes
    const [searchQuery, setSearchQuery] = useState('');

    const fetchSummary = async () => {
        setLoading(true);
        const res = await getData('admin_pincodes_summary');
        if (res && res.status && res.data) {
            setPincodes(res.data.pincodes || []);
            setZones(res.data.zones || []);
            setExcluded(res.data.excluded_areas || []);
        } else {
            setMessage({ text: res.message || 'Failed to load delivery zones.', type: 'error' });
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchSummary();
    }, []);

    // Quick Add Single Pincode
    const handleQuickAdd = async (e) => {
        e.preventDefault();
        const pin = quickPin.trim();
        if (!/^[1-9][0-9]{5}$/.test(pin)) {
            setMessage({ text: 'Please enter a valid 6-digit Indian PIN code (e.g. 284001).', type: 'error' });
            return;
        }

        const res = await postData('admin_pincode_add', {
            pincode: pin,
            zone_name: quickZoneName.trim() || 'General Delivery Zone',
        });

        if (res && res.status) {
            setMessage({ text: res.message || `Pincode ${pin} added successfully!`, type: 'success' });
            setQuickPin('');
            fetchSummary();
        } else {
            setMessage({ text: res.message || 'Failed to add pincode.', type: 'error' });
        }
    };

    // Remove Single Pincode
    const handleRemovePincode = async (pincode) => {
        if (!window.confirm(`Are you sure you want to remove PIN code ${pincode} from all delivery zones?`)) {
            return;
        }

        const res = await postData('admin_pincode_remove', { pincode });
        if (res && res.status) {
            setMessage({ text: res.message || `Pincode ${pincode} removed successfully.`, type: 'success' });
            fetchSummary();
        } else {
            setMessage({ text: res.message || 'Failed to remove pincode.', type: 'error' });
        }
    };

    // Save or Edit Full Zone
    const handleSaveZone = async () => {
        if (!currentZone.zone_name.trim() || !currentZone.postcodes.trim()) {
            setMessage({ text: 'Zone name and comma-separated pincodes are required.', type: 'error' });
            return;
        }

        const payload = {
            zone_name: currentZone.zone_name.trim(),
            postcodes: currentZone.postcodes.trim(),
        };
        if (currentZone.id) {
            payload.id = currentZone.id;
        }

        const res = await postData('admin_delivery_zone_save', payload);
        if (res && res.status) {
            setMessage({ text: res.message || 'Delivery zone saved successfully!', type: 'success' });
            setZoneDialogOpen(false);
            setCurrentZone({ id: null, zone_name: '', postcodes: '' });
            fetchSummary();
        } else {
            setMessage({ text: res.message || 'Failed to save delivery zone.', type: 'error' });
        }
    };

    // Delete Entire Zone
    const handleDeleteZone = async (zoneId, zoneName) => {
        if (!window.confirm(`Are you sure you want to delete delivery zone "${zoneName}"?`)) {
            return;
        }

        const res = await postData('admin_delivery_zone_delete', { id: zoneId });
        if (res && res.status) {
            setMessage({ text: res.message || 'Zone deleted successfully.', type: 'success' });
            fetchSummary();
        } else {
            setMessage({ text: res.message || 'Failed to delete zone.', type: 'error' });
        }
    };

    // Save Excluded Area
    const handleSaveExcluded = async () => {
        if (!currentExcluded.area_name.trim() || !currentExcluded.postcode.trim()) {
            setMessage({ text: 'Area name and 6-digit pincode are required.', type: 'error' });
            return;
        }

        const res = await postData('admin_excluded_area_save', currentExcluded);
        if (res && res.status) {
            setMessage({ text: res.message || 'Excluded area added successfully!', type: 'success' });
            setExcludedDialogOpen(false);
            setCurrentExcluded({ area_name: '', postcode: '' });
            fetchSummary();
        } else {
            setMessage({ text: res.message || 'Failed to add excluded area.', type: 'error' });
        }
    };

    // Delete Excluded Area
    const handleDeleteExcluded = async (areaId) => {
        const res = await postData('admin_excluded_area_delete', { id: areaId });
        if (res && res.status) {
            setMessage({ text: res.message || 'Excluded area removed.', type: 'success' });
            fetchSummary();
        } else {
            setMessage({ text: res.message || 'Failed to remove excluded area.', type: 'error' });
        }
    };

    const filteredPincodes = pincodes.filter((item) =>
        item.pincode.includes(searchQuery.trim()) ||
        item.zones.some((z) => z.zone_name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="h5" fontWeight={800} color="#1e293b">
                            Delivery Pincodes & Serviceable Zones
                        </Typography>
                        <Chip
                            size="small"
                            color="success"
                            icon={<CheckCircleOutlineIcon />}
                            label={`${pincodes.length} Active PINs`}
                            sx={{ fontWeight: 700 }}
                        />
                    </Box>
                    <Typography variant="body2" color="#64748b" sx={{ mt: 0.5 }}>
                        Configure the exact pincodes where customers can order doorstep Try & Buy trials.
                    </Typography>
                </Box>

                <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={fetchSummary}
                    disabled={loading}
                    sx={{ borderColor: '#cbd5e1', color: '#475569' }}
                >
                    Refresh
                </Button>
            </Box>

            {/* Notification message */}
            {message.text && (
                <Alert
                    severity={message.type}
                    onClose={() => setMessage({ text: '', type: 'info' })}
                    sx={{ borderRadius: 2 }}
                >
                    {message.text}
                </Alert>
            )}

            {/* Quick Add Pincode Card */}
            <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                    <Typography variant="subtitle1" fontWeight={700} color="#0f172a" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AddLocationAltIcon sx={{ color: '#315c4d' }} />
                        Quick Add Serviceable Pincode
                    </Typography>
                    <Typography variant="body2" color="#64748b" sx={{ mb: 2 }}>
                        Add any 6-digit PIN code to make it immediately serviceable for customer checkouts and trials.
                    </Typography>

                    <Box component="form" onSubmit={handleQuickAdd} sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                        <TextField
                            label="Pincode (6 digits)"
                            placeholder="e.g. 284001"
                            size="small"
                            value={quickPin}
                            onChange={(e) => setQuickPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            inputProps={{ maxLength: 6 }}
                            sx={{ width: { xs: '100%', sm: 180 } }}
                            required
                        />

                        <TextField
                            label="Assign to Hub / Zone Name"
                            placeholder="e.g. Jhansi - Sadar & City Central"
                            size="small"
                            value={quickZoneName}
                            onChange={(e) => setQuickZoneName(e.target.value)}
                            sx={{ flex: '1 1 240px' }}
                            required
                        />

                        <Button
                            type="submit"
                            variant="contained"
                            disabled={loading || quickPin.length !== 6}
                            sx={{
                                bgcolor: '#315c4d',
                                '&:hover': { bgcolor: '#24453a' },
                                px: 3,
                                py: 1,
                                height: 40,
                                fontWeight: 700,
                            }}
                        >
                            + Add Serviceable PIN
                        </Button>
                    </Box>
                </CardContent>
            </Card>

            {/* Active Serviceable Pincodes Grid */}
            <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                        <Box>
                            <Typography variant="h6" fontWeight={700} color="#0f172a">
                                Active Serviceable Pincodes ({pincodes.length})
                            </Typography>
                            <Typography variant="body2" color="#64748b">
                                Customers with delivery addresses matching these PIN codes can place Try & Buy orders.
                            </Typography>
                        </Box>

                        <TextField
                            placeholder="Search pincode or zone..."
                            size="small"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            sx={{ width: { xs: '100%', sm: 220 } }}
                        />
                    </Box>

                    {filteredPincodes.length === 0 ? (
                        <Box sx={{ p: 4, textAlign: 'center', color: '#94a3b8' }}>
                            <LocationOnOutlinedIcon sx={{ fontSize: 48, mb: 1, opacity: 0.6 }} />
                            <Typography variant="body1">No serviceable pincodes found.</Typography>
                        </Box>
                    ) : (
                        <Grid container spacing={2}>
                            {filteredPincodes.map((item) => (
                                <Grid item xs={12} sm={6} md={3} key={item.pincode}>
                                    <Paper
                                        variant="outlined"
                                        sx={{
                                            p: 2,
                                            borderRadius: 2.5,
                                            border: '1px solid #e2e8f0',
                                            bgcolor: '#f8fafc',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 1,
                                            position: 'relative',
                                            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                                            '&:hover': {
                                                transform: 'translateY(-2px)',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                                                borderColor: '#cbd5e1',
                                            },
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography variant="h6" fontWeight={800} color="#0f172a" sx={{ letterSpacing: '0.05em' }}>
                                                {item.pincode}
                                            </Typography>
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => handleRemovePincode(item.pincode)}
                                                title="Remove this pincode"
                                                sx={{ p: 0.5 }}
                                            >
                                                <DeleteOutlineIcon fontSize="small" />
                                            </IconButton>
                                        </Box>

                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, minHeight: 24 }}>
                                            {item.zones.map((z, idx) => (
                                                <Chip
                                                    key={idx}
                                                    size="small"
                                                    label={z.zone_name.replace('Jhansi - ', '')}
                                                    sx={{ fontSize: '11px', height: 20, bgcolor: '#e2e8f0', color: '#334155' }}
                                                />
                                            ))}
                                        </Box>

                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 'auto' }}>
                                            <CheckCircleOutlineIcon sx={{ fontSize: 14, color: '#16a34a' }} />
                                            <Typography variant="caption" color="#16a34a" fontWeight={700}>
                                                Serviceable for Trials
                                            </Typography>
                                        </Box>
                                    </Paper>
                                </Grid>
                            ))}
                        </Grid>
                    )}
                </CardContent>
            </Card>

            {/* Delivery Zones Breakdown Table */}
            <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                        <Box>
                            <Typography variant="h6" fontWeight={700} color="#0f172a">
                                Delivery Zone Hubs ({zones.length})
                            </Typography>
                            <Typography variant="body2" color="#64748b">
                                Operational hubs for dispatching riders and grouping postal areas.
                            </Typography>
                        </Box>

                        <Button
                            variant="outlined"
                            onClick={() => {
                                setCurrentZone({ id: null, zone_name: '', postcodes: '' });
                                setZoneDialogOpen(true);
                            }}
                            sx={{ borderColor: '#315c4d', color: '#315c4d', fontWeight: 700 }}
                        >
                            + New Zone Hub
                        </Button>
                    </Box>

                    <Paper variant="outlined" sx={{ overflow: 'hidden', borderRadius: 2 }}>
                        <Table size="small">
                            <TableHead sx={{ bgcolor: '#f8fafc' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Zone / Hub Name</TableCell>
                                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Pincodes Included</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 700, color: '#475569' }}>PIN Count</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700, color: '#475569' }}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {zones.map((zone) => (
                                    <TableRow key={zone.id} hover>
                                        <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>
                                            {zone.zone_name}
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                {zone.postcodes.split(',').map((p, idx) => (
                                                    <Chip
                                                        key={idx}
                                                        size="small"
                                                        label={p.trim()}
                                                        sx={{ fontSize: '11px', height: 20, bgcolor: '#f1f5f9' }}
                                                    />
                                                ))}
                                            </Box>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip size="small" label={zone.postcodes_count} sx={{ fontWeight: 700 }} />
                                        </TableCell>
                                        <TableCell align="right">
                                            <IconButton
                                                size="small"
                                                onClick={() => {
                                                    setCurrentZone(zone);
                                                    setZoneDialogOpen(true);
                                                }}
                                                title="Edit Zone"
                                            >
                                                <EditOutlinedIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => handleDeleteZone(zone.id, zone.zone_name)}
                                                title="Delete Zone"
                                            >
                                                <DeleteOutlineIcon fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Paper>
                </CardContent>
            </Card>

            {/* Excluded / Restricted Areas Section */}
            <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                        <Box>
                            <Typography variant="h6" fontWeight={700} color="#0f172a" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <BlockOutlinedIcon sx={{ color: '#ef4444' }} />
                                Excluded Restricted Areas ({excluded.length})
                            </Typography>
                            <Typography variant="body2" color="#64748b">
                                High-security, military, or prohibited pockets blocked from trial deliveries.
                            </Typography>
                        </Box>

                        <Button
                            variant="outlined"
                            color="error"
                            onClick={() => {
                                setCurrentExcluded({ area_name: '', postcode: '' });
                                setExcludedDialogOpen(true);
                            }}
                            sx={{ fontWeight: 700 }}
                        >
                            + Add Excluded Pocket
                        </Button>
                    </Box>

                    {excluded.length === 0 ? (
                        <Box sx={{ p: 2, textAlign: 'center', color: '#94a3b8', bgcolor: '#f8fafc', borderRadius: 2 }}>
                            <Typography variant="body2">No restricted or excluded areas currently configured.</Typography>
                        </Box>
                    ) : (
                        <Paper variant="outlined" sx={{ overflow: 'hidden', borderRadius: 2 }}>
                            <Table size="small">
                                <TableHead sx={{ bgcolor: '#fef2f2' }}>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 700, color: '#991b1b' }}>Restricted Area Name</TableCell>
                                        <TableCell sx={{ fontWeight: 700, color: '#991b1b' }}>Pincode</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700, color: '#991b1b' }}>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {excluded.map((item) => (
                                        <TableRow key={item.id} hover>
                                            <TableCell sx={{ fontWeight: 600 }}>{item.area_name}</TableCell>
                                            <TableCell>
                                                <Chip size="small" color="error" label={item.postcode} sx={{ fontWeight: 700 }} />
                                            </TableCell>
                                            <TableCell align="right">
                                                <IconButton size="small" color="error" onClick={() => handleDeleteExcluded(item.id)}>
                                                    <DeleteOutlineIcon fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Paper>
                    )}
                </CardContent>
            </Card>

            {/* Dialog: Add/Edit Zone */}
            <Dialog open={zoneDialogOpen} onClose={() => setZoneDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 800 }}>
                    {currentZone.id ? 'Edit Delivery Zone' : 'Create New Delivery Zone'}
                </DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                    <TextField
                        label="Zone / Hub Name"
                        placeholder="e.g. Jhansi - Sadar & City Central"
                        fullWidth
                        value={currentZone.zone_name}
                        onChange={(e) => setCurrentZone({ ...currentZone, zone_name: e.target.value })}
                        required
                    />
                    <TextField
                        label="Pincodes (Comma-separated 6-digit PINs)"
                        placeholder="e.g. 284001, 284002, 284003, 284128"
                        fullWidth
                        multiline
                        rows={3}
                        value={currentZone.postcodes}
                        onChange={(e) => setCurrentZone({ ...currentZone, postcodes: e.target.value })}
                        helperText="Enter 6-digit Indian PIN codes separated by commas."
                        required
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setZoneDialogOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleSaveZone}
                        sx={{ bgcolor: '#315c4d', '&:hover': { bgcolor: '#24453a' }, fontWeight: 700 }}
                    >
                        Save Zone
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Dialog: Add Excluded Area */}
            <Dialog open={excludedDialogOpen} onClose={() => setExcludedDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 800 }}>Add Excluded Pocket</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                    <TextField
                        label="Restricted Area Name"
                        placeholder="e.g. Military High Security Zone"
                        fullWidth
                        value={currentExcluded.area_name}
                        onChange={(e) => setCurrentExcluded({ ...currentExcluded, area_name: e.target.value })}
                        required
                    />
                    <TextField
                        label="Pincode (6 digits)"
                        placeholder="e.g. 284128"
                        fullWidth
                        value={currentExcluded.postcode}
                        onChange={(e) => setCurrentExcluded({ ...currentExcluded, postcode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                        inputProps={{ maxLength: 6 }}
                        required
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setExcludedDialogOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleSaveExcluded}
                        sx={{ fontWeight: 700 }}
                    >
                        Add Exclusion
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
