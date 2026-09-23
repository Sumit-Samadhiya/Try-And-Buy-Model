import React, { useState, useEffect } from 'react';
import { Box, Grid, Paper, Typography, Card, CardContent } from '@mui/material';
import { getData } from '../../services/FetchDjangoApiServices';

export default function Dashboard() {
    const [analytics, setAnalytics] = useState({
        total_orders: 0,
        completed_orders: 0,
        total_revenue: 0
    });

    const fetchAnalytics = async () => {
        const result = await getData('get_order_analytics');
        if (result.status) {
            setAnalytics(result.data);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, []);

    return (
        <Box sx={{ flexGrow: 1, padding: 3 }}>
            <Typography variant="h4" gutterBottom>Admin Dashboard</Typography>
            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <Paper sx={{ padding: 2 }}>
                        <Typography variant="h6">Total Orders</Typography>
                        <Typography variant="h4">{analytics.total_orders}</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Paper sx={{ padding: 2 }}>
                        <Typography variant="h6">Completed Orders</Typography>
                        <Typography variant="h4">{analytics.completed_orders}</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Paper sx={{ padding: 2 }}>
                        <Typography variant="h6">Total Revenue</Typography>
                        <Typography variant="h4">₹{analytics.total_revenue}</Typography>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}
