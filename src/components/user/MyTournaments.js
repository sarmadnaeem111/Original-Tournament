import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Alert, Button } from 'react-bootstrap';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import TournamentStatusService from '../../services/TournamentStatusService';
import { useNavigate } from 'react-router-dom';
import './MyTournaments.css'; // Import the new CSS file

function MyTournaments() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Fetch user's tournaments on component mount
  useEffect(() => {
    if (currentUser) {
      fetchMyTournaments();
    }
  }, [currentUser]);

  async function fetchMyTournaments() {
    try {
      setLoading(true);
      
      // Check and update tournament statuses before fetching
      await TournamentStatusService.checkAndUpdateTournamentStatuses();
      
      const tournamentsCollection = collection(db, 'tournaments');
      const tournamentsSnapshot = await getDocs(tournamentsCollection);
      
      // Filter tournaments where the current user is a participant OR is the creator
      const myTournaments = tournamentsSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(tournament => 
          tournament.participants?.some(p => p.userId === currentUser.uid) || 
          tournament.createdBy === currentUser.uid
        );
      
      // Sort tournaments by date (newest first)
      myTournaments.sort((a, b) => {
        const dateA = a.tournamentDate?.toDate ? a.tournamentDate.toDate() : new Date();
        const dateB = b.tournamentDate?.toDate ? b.tournamentDate.toDate() : new Date();
        return dateB - dateA;
      });
      
      setTournaments(myTournaments);
    } catch (error) {
      setError('Failed to fetch tournaments: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadgeVariant(status) {
    switch (status) {
      case 'upcoming': return 'primary';
      case 'live': return 'success';
      case 'completed': return 'secondary';
      case 'pending': return 'warning';
      default: return 'primary';
    }
  }

  return (
    <Container className="py-4 px-3 px-md-5">
      <div className="my-tournaments-header d-flex justify-content-between align-items-center mb-4">
        <h1>My Tournaments</h1>
        <Button 
          variant="success" 
          onClick={() => navigate('/create-tournament')}
          className="create-tournament-btn"
        >
          Create Tournament
        </Button>
      </div>
      
      {error && <Alert variant="danger" className="p-2 small">{error}</Alert>}
      
      {loading ? (
        <p className="small">Loading your tournaments...</p>
      ) : (
        <Row className="g-4">
          {tournaments.length === 0 ? (
            <Col>
              <Alert variant="info" className="p-2 small">You haven&apos;t joined any tournaments yet.</Alert>
            </Col>
          ) : (
            tournaments.map(tournament => (
              <Col key={tournament.id} xs={12} sm={6} lg={4} className="mb-4">
                <Card className="h-100 my-tournament-card">
                  <Card.Header className="d-flex justify-content-between align-items-center py-2">
                    <Badge bg={getStatusBadgeVariant(tournament.status)} className="my-tournament-status py-1 px-2">
                      {tournament.status.toUpperCase()}
                    </Badge>
                    <span className="my-tournament-type">{tournament.gameType}</span>
                  </Card.Header>
                  {tournament.isPrivate && tournament.createdBy === currentUser.uid && (
                    <div className="px-3 pt-2">
                      <Badge bg={tournament.approved ? "success" : "warning"} className="w-100 py-1">
                        {tournament.approved ? "APPROVED" : "AWAITING APPROVAL"}
                      </Badge>
                      {!tournament.approved && tournament.rejectionReason && (
                        <Alert variant="danger" className="mt-2 p-2 small">
                          <strong>Rejected:</strong> {tournament.rejectionReason}
                        </Alert>
                      )}
                    </div>
                  )}
                  <Card.Body className="p-3">
                    <Card.Title className="mb-3">{tournament.gameName}</Card.Title>
                    <Card.Text>
                      <strong>Date & Time:</strong> {tournament.tournamentDate?.toDate 
                        ? tournament.tournamentDate.toDate().toLocaleDateString() 
                        : 'N/A'} {tournament.tournamentTime || ''}
                      <br />
                      <strong>Entry Fee:</strong> Rs. {tournament.entryFee}
                      <br />
                      <strong>Prize Pool:</strong> Rs. {tournament.prizePool}
                      <br />
                      <strong>Participants:</strong> {tournament.participants?.length || 0} / {tournament.maxParticipants}
                    </Card.Text>
                    
                    {tournament.status === 'upcoming' && !tournament.matchDetails && (
                      <div className="my-match-details-alert info">
                        <div className="my-match-details-content">
                          <strong>Note:</strong> Tournament details will be updated closer to the start time.
                        </div>
                      </div>
                    )}
                    
                    {tournament.status === 'upcoming' && tournament.matchDetails && (
                      <div className="my-match-details-alert info">
                        <div className="my-match-details-content">
                          <strong>Match Details:</strong><br />
                          {tournament.matchDetails}
                        </div>
                      </div>
                    )}
                    
                    {tournament.status === 'live' && tournament.matchDetails && (
                      <div className="my-match-details-alert">
                        <div className="my-match-details-content">
                          <strong>Match Details:</strong><br />
                          {tournament.matchDetails}
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-auto pt-3">
                      <Button 
                        variant="outline-info" 
                        onClick={() => navigate(`/tournaments/${tournament.id}`)}
                        className="w-100 view-details-btn"
                      >
                        View Details
                      </Button>
                    </div>
                  </Card.Body>
                  <Card.Footer className={`py-2 small ${tournament.status === 'live' ? 'bg-success text-white' : tournament.status === 'completed' ? 'bg-secondary text-white' : ''}`}>
                    {tournament.status === 'upcoming' ? 'Registration open' : tournament.status === 'live' ? 'Tournament in progress' : 'Tournament ended'}
                  </Card.Footer>
                </Card>
              </Col>
            ))
          )}
        </Row>
      )}
    </Container>
  );
}

export default MyTournaments;