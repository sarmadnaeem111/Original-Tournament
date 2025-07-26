import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Modal, Form, Alert, Badge } from 'react-bootstrap';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import DOMPurify from 'dompurify';

function TournamentApproval() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [modalAction, setModalAction] = useState(''); // 'approve', 'reject', or 'view'

  useEffect(() => {
    fetchPendingTournaments();
  }, []);

  async function fetchPendingTournaments() {
    try {
      setLoading(true);
      
      // Query tournaments with status 'pending' (awaiting approval)
      const tournamentsCollection = collection(db, 'tournaments');
      const pendingQuery = query(tournamentsCollection, where("status", "==", "pending"));
      const tournamentsSnapshot = await getDocs(pendingQuery);
      
      const tournamentsList = tournamentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort by creation date (newest first)
      tournamentsList.sort((a, b) => {
        return b.createdAt?.toDate() - a.createdAt?.toDate();
      });
      
      setTournaments(tournamentsList);
    } catch (error) {
      setError('Failed to fetch pending tournaments: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  function openTournamentModal(tournament, action) {
    setSelectedTournament(tournament);
    setModalAction(action);
    setRejectionReason('');
    setShowModal(true);
  }

  async function handleApproveTournament() {
    try {
      if (!selectedTournament) return;
      
      // Update tournament status to 'upcoming' and set approved flag
      const tournamentRef = doc(db, 'tournaments', selectedTournament.id);
      await updateDoc(tournamentRef, {
        status: 'upcoming',
        approved: true,
        approvedAt: new Date(),
        updatedAt: new Date()
      });
      
      setSuccess(`Tournament "${selectedTournament.gameName}" has been approved`);
      setShowModal(false);
      fetchPendingTournaments();
    } catch (error) {
      setError('Failed to approve tournament: ' + error.message);
    }
  }

  async function handleRejectTournament() {
    try {
      if (!selectedTournament) return;
      
      // Sanitize rejection reason
      const sanitizedReason = DOMPurify.sanitize(rejectionReason.trim());
      
      // Update tournament status to 'rejected' and store rejection reason
      const tournamentRef = doc(db, 'tournaments', selectedTournament.id);
      await updateDoc(tournamentRef, {
        status: 'rejected',
        approved: false,
        rejectionReason: sanitizedReason,
        rejectedAt: new Date(),
        updatedAt: new Date()
      });
      
      setSuccess(`Tournament "${selectedTournament.gameName}" has been rejected`);
      setShowModal(false);
      fetchPendingTournaments();
    } catch (error) {
      setError('Failed to reject tournament: ' + error.message);
    }
  }

  async function handleDeleteTournament(tournamentId, tournamentName) {
    if (window.confirm(`Are you sure you want to delete the tournament "${tournamentName}"?`)) {
      try {
        await deleteDoc(doc(db, 'tournaments', tournamentId));
        setSuccess(`Tournament "${tournamentName}" has been deleted`);
        fetchPendingTournaments();
      } catch (error) {
        setError('Failed to delete tournament: ' + error.message);
      }
    }
  }

  function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <Container className="py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Tournament Approval</h1>
        <Button variant="primary" onClick={() => fetchPendingTournaments()}>
          Refresh
        </Button>
      </div>
      
      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}
      
      {loading ? (
        <p>Loading pending tournaments...</p>
      ) : (
        <>
          {tournaments.length === 0 ? (
            <Alert variant="info">No pending tournaments requiring approval.</Alert>
          ) : (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>Tournament Name</th>
                  <th>Game Type</th>
                  <th>Created By</th>
                  <th>Date & Time</th>
                  <th>Entry Fee</th>
                  <th>Prize Pool</th>
                  <th>Created On</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tournaments.map(tournament => (
                  <tr key={tournament.id}>
                    <td>{tournament.gameName}</td>
                    <td>{tournament.gameType}</td>
                    <td>{tournament.creatorEmail || 'Unknown'}</td>
                    <td>
                      {tournament.tournamentDate ? formatDate(tournament.tournamentDate) : 'N/A'}
                      {tournament.tournamentTime ? ' at ' + tournament.tournamentTime : ''}
                    </td>
                    <td>Rs. {tournament.entryFee}</td>
                    <td>Rs. {tournament.prizePool}</td>
                    <td>{tournament.createdAt ? formatDate(tournament.createdAt) : 'N/A'}</td>
                    <td>
                      <div className="d-flex flex-wrap gap-1">
                        <Button 
                          variant="outline-primary" 
                          size="sm"
                          onClick={() => openTournamentModal(tournament, 'view')}
                        >
                          View
                        </Button>
                        <Button 
                          variant="success" 
                          size="sm"
                          onClick={() => openTournamentModal(tournament, 'approve')}
                        >
                          Approve
                        </Button>
                        <Button 
                          variant="warning" 
                          size="sm"
                          onClick={() => openTournamentModal(tournament, 'reject')}
                        >
                          Reject
                        </Button>
                        <Button 
                          variant="danger" 
                          size="sm"
                          onClick={() => handleDeleteTournament(tournament.id, tournament.gameName)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </>
      )}
      
      {/* Tournament Details/Approval/Rejection Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {modalAction === 'approve' ? 'Approve Tournament' : 
             modalAction === 'reject' ? 'Reject Tournament' : 'Tournament Details'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedTournament && (
            <>
              <h5>{selectedTournament.gameName}</h5>
              <Badge bg="secondary" className="mb-3">{selectedTournament.gameType}</Badge>
              
              <div className="row mb-3">
                <div className="col-md-6">
                  <p className="mb-1"><strong>Created By:</strong> {selectedTournament.creatorEmail || 'Unknown'}</p>
                  <p className="mb-1"><strong>Created On:</strong> {selectedTournament.createdAt ? formatDate(selectedTournament.createdAt) : 'N/A'}</p>
                </div>
                <div className="col-md-6">
                  <p className="mb-1"><strong>Tournament Date:</strong> {selectedTournament.tournamentDate ? formatDate(selectedTournament.tournamentDate) : 'N/A'}</p>
                  <p className="mb-1"><strong>Tournament Time:</strong> {selectedTournament.tournamentTime || 'N/A'}</p>
                </div>
              </div>
              
              <div className="row mb-3">
                <div className="col-md-4">
                  <p className="mb-1"><strong>Entry Fee:</strong> Rs. {selectedTournament.entryFee}</p>
                </div>
                <div className="col-md-4">
                  <p className="mb-1"><strong>Prize Pool:</strong> Rs. {selectedTournament.prizePool}</p>
                </div>
                <div className="col-md-4">
                  <p className="mb-1"><strong>Max Participants:</strong> {selectedTournament.maxParticipants}</p>
                </div>
              </div>
              
              <div className="mb-3">
                <h6>Match Details:</h6>
                <p className="small">{selectedTournament.matchDetails || 'No match details provided.'}</p>
              </div>
              
              <div className="mb-3">
                <h6>Rules & Requirements:</h6>
                <p className="small">{selectedTournament.rules || 'No rules provided.'}</p>
              </div>
              
              {modalAction === 'reject' && (
                <Form.Group className="mb-3">
                  <Form.Label>Rejection Reason:</Form.Label>
                  <Form.Control 
                    as="textarea" 
                    rows={3} 
                    value={rejectionReason} 
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Provide a reason for rejecting this tournament"
                    required
                  />
                </Form.Group>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
          
          {modalAction === 'approve' && (
            <Button variant="success" onClick={handleApproveTournament}>
              Approve Tournament
            </Button>
          )}
          
          {modalAction === 'reject' && (
            <Button 
              variant="warning" 
              onClick={handleRejectTournament}
              disabled={!rejectionReason.trim()}
            >
              Reject Tournament
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default TournamentApproval;