import { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    Grid,
    LinearProgress,
    MenuItem,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import TouchAppOutlinedIcon from '@mui/icons-material/TouchAppOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import DevicesOutlinedIcon from '@mui/icons-material/DevicesOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import { getData } from '../../services/FetchDjangoApiServices';
import DoordrapeLoader from '../../userinterface/components/DoordrapeLoader';

const formatDate = (isoStr) => {
    if (!isoStr) return '—';
    try {
        return new Date(isoStr).toLocaleString('en-IN', {
            dateStyle: 'short',
            timeStyle: 'medium',
        });
    } catch (e) {
        return isoStr;
    }
};

export default function AdminAnalyticsTracking() {
    const [data, setData] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [filters, setFilters] = useState({
        from: '',
        to: '',
        event_type: '',
        q: '',
    });
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(15);

    const loadAnalytics = useCallback(async () => {
        setBusy(true);
        setError('');
        const params = new URLSearchParams();
        if (filters.from) params.set('from', filters.from);
        if (filters.to) params.set('to', filters.to);
        if (filters.event_type) params.set('event_type', filters.event_type);
        if (filters.q) params.set('q', filters.q.trim());

        const query = params.toString() ? '?' + params.toString() : '';
        const res = await getData('admin_analytics_dashboard' + query);
        setBusy(false);

        if (res && res.status && res.data) {
            setData(res.data);
            setPage(0);
        } else {
            setError(res?.message || 'Unable to load analytics data.');
        }
    }, [filters]);

    useEffect(() => {
        loadAnalytics();
    }, [loadAnalytics]);

    const statCards = [
        {
            title: 'Total Page Views',
            value: data?.page_views ?? 0,
            hint: 'All customer & admin page visits',
            icon: <VisibilityOutlinedIcon sx={{ color: '#10b981', fontSize: 28 }} />,
            border: '#10b981',
        },
        {
            title: 'User Events',
            value: data?.user_events ?? 0,
            hint: 'Add to cart, searches & order steps',
            icon: <TouchAppOutlinedIcon sx={{ color: '#3b82f6', fontSize: 28 }} />,
            border: '#3b82f6',
        },
        {
            title: 'Unique Sessions',
            value: data?.unique_sessions ?? 0,
            hint: 'Distinct anonymous or user visits',
            icon: <DevicesOutlinedIcon sx={{ color: '#8b5cf6', fontSize: 28 }} />,
            border: '#8b5cf6',
        },
        {
            title: 'Identified Users',
            value: data?.unique_users ?? 0,
            hint: 'Verified customer mobile accounts',
            icon: <PeopleAltOutlinedIcon sx={{ color: '#f59e0b', fontSize: 28 }} />,
            border: '#f59e0b',
        },
    ];

    const recentEvents = data?.recent_events || [];
    const pagedEvents = recentEvents.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    const maxPageViews = data?.top_pages?.length ? Math.max(...data.top_pages.map((p) => p.views)) : 1;

    return (
        <Stack spacing={3}>
            {/* Header */}
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={2}>
                <Box>
                    <Typography variant="h4" fontWeight={900} color="#0f172a" sx={{ letterSpacing: -0.5 }}>
                        Analytics &amp; Real-Time Tracking
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Live visitor telemetry, navigation flows, and user interaction event audit ledger.
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<RefreshIcon />}
                    onClick={loadAnalytics}
                    sx={{
                        bgcolor: '#064e3b',
                        color: '#ffffff',
                        px: 2.5,
                        py: 1,
                        borderRadius: 2.5,
                        fontWeight: 700,
                        '&:hover': { bgcolor: '#047857' },
                    }}
                >
                    Refresh Telemetry
                </Button>
            </Stack>

            {/* Filter Bar */}
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, bgcolor: '#ffffff' }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
                    <TextField
                        size="small"
                        label="Search path, event, or mobile"
                        value={filters.q}
                        onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                        sx={{ flex: 1, minWidth: 220 }}
                    />
                    <TextField
                        select
                        size="small"
                        label="Event Type"
                        value={filters.event_type}
                        onChange={(e) => setFilters({ ...filters, event_type: e.target.value })}
                        sx={{ minWidth: 160 }}
                    >
                        <MenuItem value="">All Events</MenuItem>
                        <MenuItem value="PAGE_VIEW">Page Views Only</MenuItem>
                        <MenuItem value="USER_EVENT">User Events Only</MenuItem>
                    </TextField>
                    <TextField
                        type="date"
                        size="small"
                        label="From Date"
                        InputLabelProps={{ shrink: true }}
                        value={filters.from}
                        onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                    />
                    <TextField
                        type="date"
                        size="small"
                        label="To Date"
                        InputLabelProps={{ shrink: true }}
                        value={filters.to}
                        onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                    />
                    <Button
                        variant="outlined"
                        onClick={() => setFilters({ from: '', to: '', event_type: '', q: '' })}
                        sx={{ borderColor: '#cbd5e1', color: '#475569' }}
                    >
                        Reset
                    </Button>
                </Stack>
            </Paper>

            {busy && !data && <DoordrapeLoader variant="admin" text="Aggregating user telemetry & metrics…" size="medium" />}
            {busy && data && <LinearProgress sx={{ borderRadius: 2 }} />}
            {error && <Alert severity="error">{error}</Alert>}

            {data && (
                <>
                    {/* Stat Cards */}
                    <Grid container spacing={2}>
                        {statCards.map((card) => (
                            <Grid item xs={12} sm={6} lg={3} key={card.title}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 2.5,
                                        borderRadius: 3.5,
                                        bgcolor: '#ffffff',
                                        border: '1px solid #e2e8f0',
                                        borderTop: `4px solid ${card.border}`,
                                        boxShadow: '0 4px 15px -3px rgba(0, 0, 0, 0.05)',
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                    }}
                                >
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 700, fontSize: 13, textTransform: 'uppercase' }}>
                                            {card.title}
                                        </Typography>
                                        {card.icon}
                                    </Stack>
                                    <Typography variant="h4" sx={{ fontWeight: 900, my: 1, color: '#0f172a' }}>
                                        {card.value.toLocaleString()}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>
                                        {card.hint}
                                    </Typography>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>

                    {/* Breakdown Sections: Top Pages & Top Events */}
                    <Grid container spacing={2.5}>
                        {/* Top Pages */}
                        <Grid item xs={12} md={7}>
                            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, height: '100%', bgcolor: '#ffffff' }}>
                                <Typography variant="h6" fontWeight={800} color="#0f172a" mb={2}>
                                    Top Visited Pages (Page Views)
                                </Typography>
                                {data.top_pages?.length ? (
                                    data.top_pages.map((item) => (
                                        <Box key={item.page_path} mb={2}>
                                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                                                <Typography variant="body2" fontWeight={600} color="#1e293b" sx={{ wordBreak: 'break-all' }}>
                                                    {item.page_path}
                                                </Typography>
                                                <Chip
                                                    label={`${item.views} visits`}
                                                    size="small"
                                                    sx={{ bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#065f46', fontWeight: 700 }}
                                                />
                                            </Stack>
                                            <LinearProgress
                                                variant="determinate"
                                                value={(item.views / maxPageViews) * 100}
                                                sx={{
                                                    height: 7,
                                                    borderRadius: 4,
                                                    bgcolor: '#f1f5f9',
                                                    '& .MuiLinearProgress-bar': { bgcolor: '#10b981' },
                                                }}
                                            />
                                        </Box>
                                    ))
                                ) : (
                                    <Typography color="text.secondary">No page view data recorded yet.</Typography>
                                )}
                            </Paper>
                        </Grid>

                        {/* Top Events */}
                        <Grid item xs={12} md={5}>
                            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, height: '100%', bgcolor: '#ffffff' }}>
                                <Typography variant="h6" fontWeight={800} color="#0f172a" mb={2}>
                                    User Events Breakdown
                                </Typography>
                                {data.top_events?.length ? (
                                    <Stack spacing={1.5}>
                                        {data.top_events.map((ev) => (
                                            <Paper
                                                key={ev.event_name}
                                                variant="outlined"
                                                sx={{
                                                    p: 1.5,
                                                    borderRadius: 2,
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    bgcolor: '#f8fafc',
                                                }}
                                            >
                                                <Typography variant="body2" fontWeight={700} color="#0f172a">
                                                    {ev.event_name}
                                                </Typography>
                                                <Chip
                                                    label={`${ev.count} times`}
                                                    size="small"
                                                    sx={{ bgcolor: '#022c22', color: '#a7f3d0', fontWeight: 800 }}
                                                />
                                            </Paper>
                                        ))}
                                    </Stack>
                                ) : (
                                    <Typography color="text.secondary">No user interaction events recorded yet.</Typography>
                                )}
                            </Paper>
                        </Grid>
                    </Grid>

                    {/* Live Event Stream / Audit Table */}
                    <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', bgcolor: '#ffffff' }}>
                        <Box sx={{ p: 2.5, borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                                <Typography variant="h6" fontWeight={800} color="#0f172a">
                                    Live Event Stream (Audit Log)
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Latest customer navigation and interactions in real-time
                                </Typography>
                            </Box>
                            <Chip label={`${recentEvents.length} events logged`} size="small" />
                        </Box>
                        <TableContainer sx={{ maxHeight: 520 }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 800 }}>Timestamp</TableCell>
                                        <TableCell sx={{ fontWeight: 800 }}>Type</TableCell>
                                        <TableCell sx={{ fontWeight: 800 }}>Event Name</TableCell>
                                        <TableCell sx={{ fontWeight: 800 }}>Page / Path</TableCell>
                                        <TableCell sx={{ fontWeight: 800 }}>User / Mobile</TableCell>
                                        <TableCell sx={{ fontWeight: 800 }}>Session ID</TableCell>
                                        <TableCell sx={{ fontWeight: 800 }}>Properties</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {pagedEvents.length > 0 ? (
                                        pagedEvents.map((row) => (
                                            <TableRow key={row.id} hover>
                                                <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                                                    {formatDate(row.created_at)}
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        size="small"
                                                        label={row.event_type}
                                                        sx={{
                                                            fontSize: '0.7rem',
                                                            fontWeight: 700,
                                                            bgcolor: row.event_type === 'PAGE_VIEW' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                                            color: row.event_type === 'PAGE_VIEW' ? '#1d4ed8' : '#047857',
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>
                                                    {row.event_name}
                                                </TableCell>
                                                <TableCell sx={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                                                    {row.page_path || '—'}
                                                </TableCell>
                                                <TableCell sx={{ fontSize: '0.8rem' }}>
                                                    {row.user_mobile ? (
                                                        <b>{row.user_mobile}</b>
                                                    ) : (
                                                        <span style={{ color: '#94a3b8' }}>Anonymous</span>
                                                    )}
                                                </TableCell>
                                                <TableCell sx={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.75rem', color: '#64748b' }}>
                                                    {row.session_id || '—'}
                                                </TableCell>
                                                <TableCell sx={{ maxWidth: 250, fontSize: '0.75rem', color: '#475569' }}>
                                                    {Object.keys(row.properties || {}).length ? JSON.stringify(row.properties) : '—'}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={7} align="center" sx={{ py: 6, color: '#94a3b8' }}>
                                                No tracking events match the selected criteria.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <TablePagination
                            component="div"
                            count={recentEvents.length}
                            page={page}
                            rowsPerPage={rowsPerPage}
                            rowsPerPageOptions={[10, 15, 25, 50]}
                            onPageChange={(_, newPage) => setPage(newPage)}
                            onRowsPerPageChange={(e) => {
                                setRowsPerPage(parseInt(e.target.value, 10));
                                setPage(0);
                            }}
                        />
                    </Paper>
                </>
            )}
        </Stack>
    );
}
