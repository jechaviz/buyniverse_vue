
import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { User } from '@/types';

interface BiddingChartProps {
    bidHistory: { userId: string; amount: number; timestamp: Date }[];
    participants: (User | undefined)[];
    startTime: Date;
    endTime: Date;
}

const BiddingChart: React.FC<BiddingChartProps> = ({ bidHistory, participants, startTime, endTime }) => {

    const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F', '#FFBB28'];

    const participantData = useMemo(() => {
        return participants.map((p, index) => ({
            id: p?.id,
            name: p?.name || 'Unknown',
            color: COLORS[index % COLORS.length]
        }));
    }, [participants]);

    const chartData = useMemo(() => {
        const dataPoints: any[] = [];
        const totalDuration = endTime.getTime() - startTime.getTime();
        
        // Create a consolidated list of events (bids)
        const events = bidHistory.map(bid => ({
            time: new Date(bid.timestamp).getTime(),
            userId: bid.userId,
            amount: bid.amount
        })).sort((a,b) => a.time - b.time);

        // For each participant, create their bidding line
        participantData.forEach(p => {
            const participantBids = events.filter(e => e.userId === p.id);
            if (participantBids.length > 0) {
                // Start with initial bid
                let lastAmount = participantBids[0].amount;
                dataPoints.push({ time: 0, [p.name]: lastAmount });
                
                participantBids.forEach(bid => {
                     const timeOffset = (bid.time - startTime.getTime()) / 1000;
                     // Carry over the previous value
                     dataPoints.push({ time: timeOffset - 0.01, [p.name]: lastAmount });
                     // Add the new bid value
                     dataPoints.push({ time: timeOffset, [p.name]: bid.amount });
                     lastAmount = bid.amount;
                });
                // Carry the last bid to the end of the chart
                dataPoints.push({ time: totalDuration / 1000, [p.name]: lastAmount });
            }
        });
        
       // Consolidate data points by time
        const consolidated = dataPoints.reduce((acc, point) => {
            const timeKey = point.time.toFixed(2);
            if (!acc[timeKey]) {
                acc[timeKey] = { time: point.time };
            }
            Object.assign(acc[timeKey], point);
            return acc;
        }, {});
        
        // Fill forward values
        const finalData = Object.values(consolidated).sort((a: any, b: any) => a.time - b.time);
        let lastValues: Record<string, number> = {};
        participantData.forEach(p => {
             const initialBid = events.find(e => e.userId === p.id)?.amount;
             if (initialBid) lastValues[p.name] = initialBid;
        });

        finalData.forEach((point: any) => {
             participantData.forEach(p => {
                if (point[p.name] === undefined) {
                    point[p.name] = lastValues[p.name];
                } else {
                    lastValues[p.name] = point[p.name];
                }
            });
        });

        return finalData;

    }, [bidHistory, participantData, startTime, endTime]);

    const formatTime = (tick: number) => {
        const minutes = Math.floor(tick / 60);
        const seconds = Math.floor(tick % 60);
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis 
                        dataKey="time" 
                        type="number" 
                        domain={[0, (endTime.getTime() - startTime.getTime())/1000]}
                        tickFormatter={formatTime}
                        label={{ value: "Time", position: "insideBottom", offset: -5 }}
                    />
                    <YAxis 
                        domain={['dataMin - 100', 'dataMax + 100']} 
                        allowDataOverflow 
                        label={{ value: "Bid Amount ($)", angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                        formatter={(value) => `$${Number(value).toLocaleString()}`}
                        labelFormatter={formatTime}
                    />
                    <Legend />
                    {participantData.map(p => (
                        <Line 
                            key={p.id} 
                            type="stepAfter" 
                            dataKey={p.name} 
                            stroke={p.color} 
                            strokeWidth={2}
                            dot={false}
                            connectNulls
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default BiddingChart;
