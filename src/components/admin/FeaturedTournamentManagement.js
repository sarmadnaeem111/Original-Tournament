import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Modal, Form, Alert } from 'react-bootstrap';
import { collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { sanitizeInput } from '../../utils/security';

function FeaturedTournamentManagement() {
  const [tournaments, setTournaments] = useState([]);
  const [featuredTournaments, setFeaturedTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [displayOrder, setDisplayOrder] = useState(1);

  // Fetch tournaments and featured tournaments when component mounts
  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      setError('');
      
      // Fetch all tournaments
      const tournamentsCollection = collection(db, 'tournaments');
      const tournamentsSnapshot = await getDocs(tournamentsCollection);
      const tournamentsList = tournamentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTournaments(tournamentsList);
      
      // Fetch featured tournaments
      const featuredDoc = doc(db, 'adminSettings', 'featuredTournaments');
      const featuredSnapshot = await getDoc(featuredDoc);
      
      if (featuredSnapshot.exists()) {
        const featuredData = featuredSnapshot.data();
        // Sort by displayOrder
        const sortedFeatured = featuredData.tournaments.sort((a, b) => a.displayOrder - b.displayOrder);
        setFeaturedTournaments(sortedFeatured);
      } else {
        // Initialize empty featured tournaments document if it doesn't exist
        await setDoc(featuredDoc, { tournaments: [] });
        setFeaturedTournaments([]);
      }
    } catch (error) {
      setError('Failed to fetch data: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setSelectedTournament(null);
    setDisplayOrder(featuredTournaments.length + 1);
    setShowModal(true);
  }

  function handleCloseModal() {
    setShowModal(false);
    setSelectedTournament(null);
  }

  function handleTournamentSelect(e) {
    const tournamentId = e.target.value;
    if (tournamentId) {
      const tournament = tournaments.find(t => t.id === tournamentId);
      setSelectedTournament(tournament);
    } else {
      setSelectedTournament(null);
    }
  }

  function handleDisplayOrderChange(e) {
    setDisplayOrder(parseInt(e.target.value) || 1);
  }

  async function handleAddFeatured() {
    if (!selectedTournament) {
      setError('Please select a tournament');
      return;
    }

    try {
      setError('');
      
      // Create featured tournament object
      const featuredTournament = {
        id: selectedTournament.id,
        gameName: sanitizeInput(selectedTournament.gameName),
        gameType: sanitizeInput(selectedTournament.gameType),
        prizePool: selectedTournament.prizePool,
        status: selectedTournament.status,
        displayOrder: displayOrder,
        addedAt: new Date().toISOString()
      };
      
      // Add to featured tournaments
      const featuredDoc = doc(db, 'adminSettings', 'featuredTournaments');
      const featuredSnapshot = await getDoc(featuredDoc);
      
      let updatedFeatured = [];
      
      if (featuredSnapshot.exists()) {
        const featuredData = featuredSnapshot.data();
        // Check if tournament is already featured
        const existingIndex = featuredData.tournaments.findIndex(t => t.id === selectedTournament.id);
        
        if (existingIndex >= 0) {
          setError('This tournament is already featured');
          return;
        }
        
        updatedFeatured = [...featuredData.tournaments, featuredTournament];
      } else {
        updatedFeatured = [featuredTournament];
      }
      
      // Update Firestore
      await setDoc(featuredDoc, { tournaments: updatedFeatured });
      
      // Refresh data
      fetchData();
      handleCloseModal();
    } catch (error) {
      setError('Failed to add featured tournament: ' + error.message);
    }
  }

  async function handleRemoveFeatured(tournamentId) {
    try {
      setError('');
      
      // Get current featured tournaments
      const featuredDoc = doc(db, 'adminSettings', 'featuredTournaments');
      const featuredSnapshot = await getDoc(featuredDoc);
      
      if (featuredSnapshot.exists()) {
        const featuredData = featuredSnapshot.data();
        // Remove the tournament
        const updatedFeatured = featuredData.tournaments.filter(t => t.id !== tournamentId);
        
        // Update Firestore
        await setDoc(featuredDoc, { tournaments: updatedFeatured });
        
        // Refresh data
        fetchData();
      }
    } catch (error) {
      setError('Failed to remove featured tournament: ' + error.message);
    }
  }

  async function handleMoveUp(index) {
    if (index <= 0) return;
    
    try {
      const featuredDoc = doc(db, 'adminSettings', 'featuredTournaments');
      const featuredData = [...featuredTournaments];
      
      // Swap with previous item
      const temp = featuredData[index];
      featuredData[index] = featuredData[index - 1];
      featuredData[index - 1] = temp;
      
      // Update display orders
      featuredData.forEach((item, i) => {
        item.displayOrder = i + 1;
      });
      
      // Update Firestore
      await setDoc(featuredDoc, { tournaments: featuredData });
      
      // Refresh data
      fetchData();
    } catch (error) {
      setError('Failed to reorder featured tournaments: ' + error.message);
    }
  }

  async function handleMoveDown(index) {
    if (index >= featuredTournaments.length - 1) return;
    
    try {
      const featuredDoc = doc(db, 'adminSettings', 'featuredTournaments');
      const featuredData = [...featuredTournaments];
      
      // Swap with next item
      const temp = featuredData[index];
      featuredData[index] = featuredData[index + 1];
      featuredData[index + 1] = temp;
      
      // Update display orders
      featuredData.forEach((item, i) => {
        item.displayOrder = i + 1;
      });
      
      // Update Firestore
      await setDoc(featuredDoc, { tournaments: featuredData });
      
      // Refresh data
      fetchData();
    } catch (error) {
      setError('Failed to reorder featured tournaments: ' + error.message);
    }
  }

  return (
    <Container className="py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Featured Tournament Management</h1>
        <Button variant="success" onClick={openAddModal}>
          Add Featured Tournament
        </Button>
      </div>
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      {loading ? (
        <p>Loading tournaments...</p>
      ) : (
        <>
          <p className="mb-4">These tournaments will be displayed in the Featured Tournaments section on the home page.</p>
          
          {featuredTournaments.length === 0 ? (
            <Alert variant="info">No featured tournaments. Add tournaments to display them on the home page.</Alert>
          ) : (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Game</th>
                  <th>Type</th>
                  <th>Prize Pool</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {featuredTournaments.map((tournament, index) => (
                  <tr key={tournament.id}>
                    <td>{tournament.displayOrder}</td>
                    <td>{tournament.gameName}</td>
                    <td>{tournament.gameType}</td>
                    <td>Rs. {tournament.prizePool}</td>
                    <td>
                      <span className={`badge bg-${tournament.status === 'completed' ? 'secondary' : tournament.status === 'live' ? 'success' : 'primary'}`}>
                        {tournament.status}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex gap-2">
                        <Button 
                          variant="outline-secondary" 
                          size="sm"
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                        >
                          ↑
                        </Button>
                        <Button 
                          variant="outline-secondary" 
                          size="sm"
                          onClick={() => handleMoveDown(index)}
                          disabled={index === featuredTournaments.length - 1}
                        >
                          ↓
                        </Button>
                        <Button 
                          variant="outline-danger" 
                          size="sm"
                          onClick={() => handleRemoveFeatured(tournament.id)}
                        >
                          Remove
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
      
      {/* Add Featured Tournament Modal */}
      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>Add Featured Tournament</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Select Tournament</Form.Label>
              <Form.Select onChange={handleTournamentSelect}>
                <option value="">Select a tournament</option>
                {tournaments.map(tournament => (
                  <option key={tournament.id} value={tournament.id}>
                    {tournament.gameName} ({tournament.gameType}) - {tournament.status}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Display Order</Form.Label>
              <Form.Control 
                type="number" 
                min="1"
                value={displayOrder}
                onChange={handleDisplayOrderChange}
              />
              <Form.Text className="text-muted">
                Lower numbers will be displayed first.
              </Form.Text>
            </Form.Group>
            
            {selectedTournament && (
              <div className="mb-3 p-3 border rounded">
                <h5>Tournament Preview</h5>
                <p><strong>Name:</strong> {selectedTournament.gameName}</p>
                <p><strong>Type:</strong> {selectedTournament.gameType}</p>
                <p><strong>Prize Pool:</strong> Rs. {selectedTournament.prizePool}</p>
                <p><strong>Status:</strong> {selectedTournament.status}</p>
              </div>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleAddFeatured}>
            Add to Featured
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default FeaturedTournamentManagement;