import React, { useState } from 'react';
import { Container, Form, Button, Alert, Card } from 'react-bootstrap';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';

function CreateTournament() {
  const [formData, setFormData] = useState({
    gameName: '',
    gameType: 'PUBG',
    tournamentDate: '',
    tournamentTime: '',
    entryFee: 0,
    prizePool: 0,
    maxParticipants: 100,
    matchDetails: '',
    rules: '',
    isPrivate: true, // Default to private tournament
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  function handleInputChange(e) {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : 
             (name === 'entryFee' || name === 'prizePool' || name === 'maxParticipants') ? 
             Number(value) : value
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');
      setLoading(true);
      
      // Validate form data
      if (!formData.gameName.trim()) {
        throw new Error('Tournament name is required');
      }
      
      if (!formData.tournamentDate || !formData.tournamentTime) {
        throw new Error('Tournament date and time are required');
      }
      
      // Sanitize user inputs
      const sanitizedFormData = {
        ...formData,
        gameName: DOMPurify.sanitize(formData.gameName.trim()),
        matchDetails: DOMPurify.sanitize(formData.matchDetails.trim()),
        rules: DOMPurify.sanitize(formData.rules.trim())
      };
      
      // Create tournament data
      const tournamentData = {
        ...sanitizedFormData,
        tournamentDate: Timestamp.fromDate(new Date(sanitizedFormData.tournamentDate)),
        status: 'pending', // Pending admin approval
        createdBy: currentUser.uid,
        creatorEmail: currentUser.email,
        participants: [], // Initialize with empty participants array
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        approved: false, // Requires admin approval
      };
      
      // Add to Firestore
      await addDoc(collection(db, 'tournaments'), tournamentData);
      
      setSuccess('Tournament created successfully! It will be visible after admin approval.');
      
      // Reset form
      setFormData({
        gameName: '',
        gameType: 'PUBG',
        tournamentDate: '',
        tournamentTime: '',
        entryFee: 0,
        prizePool: 0,
        maxParticipants: 100,
        matchDetails: '',
        rules: '',
        isPrivate: true,
      });
      
      // Redirect after a short delay
      setTimeout(() => {
        navigate('/my-tournaments');
      }, 3000);
      
    } catch (error) {
      setError('Failed to create tournament: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container className="py-4 px-3 px-md-5">
      <h1 className="mb-4">Create Your Tournament</h1>
      
      <Card className="mb-4">
        <Card.Body>
          <Card.Title className="mb-3">Tournament Creation Guidelines</Card.Title>
          <Card.Text>
            <ul className="small">
              <li>Your tournament will require admin approval before it becomes visible to other users.</li>
              <li>Entry fees should be reasonable and match the prize pool.</li>
              <li>Provide clear rules and match details to avoid confusion.</li>
              <li>You will be responsible for organizing and managing your tournament.</li>
              <li>The platform will handle participant registration and entry fee collection.</li>
            </ul>
          </Card.Text>
        </Card.Body>
      </Card>
      
      {error && <Alert variant="danger" className="p-2 small" onClose={() => setError('')} dismissible>{error}</Alert>}
      {success && <Alert variant="success" className="p-2 small" onClose={() => setSuccess('')} dismissible>{success}</Alert>}
      
      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Label>Tournament Name</Form.Label>
          <Form.Control 
            type="text" 
            name="gameName" 
            value={formData.gameName} 
            onChange={handleInputChange} 
            required 
            placeholder="Enter a name for your tournament"
          />
        </Form.Group>
        
        <Form.Group className="mb-3">
          <Form.Label>Game Type</Form.Label>
          <Form.Select 
            name="gameType" 
            value={formData.gameType} 
            onChange={handleInputChange} 
            required
          >
            <option value="PUBG">PUBG</option>
            <option value="Dead Shot">Dead Shot</option>
            <option value="8 Ball Pool">8 Ball Pool</option>
            <option value="Call of Duty">Call of Duty</option>
            <option value="Free Fire">Free Fire</option>
            <option value="Other">Other</option>
          </Form.Select>
        </Form.Group>
        
        <div className="row">
          <div className="col-md-6">
            <Form.Group className="mb-3">
              <Form.Label>Tournament Date</Form.Label>
              <Form.Control 
                type="date" 
                name="tournamentDate" 
                value={formData.tournamentDate} 
                onChange={handleInputChange} 
                required 
              />
            </Form.Group>
          </div>
          <div className="col-md-6">
            <Form.Group className="mb-3">
              <Form.Label>Tournament Time</Form.Label>
              <Form.Control 
                type="time" 
                name="tournamentTime" 
                value={formData.tournamentTime} 
                onChange={handleInputChange} 
                required 
              />
            </Form.Group>
          </div>
        </div>
        
        <div className="row">
          <div className="col-md-4">
            <Form.Group className="mb-3">
              <Form.Label>Entry Fee (Rs.)</Form.Label>
              <Form.Control 
                type="number" 
                name="entryFee" 
                value={formData.entryFee} 
                onChange={handleInputChange} 
                min="0" 
                required 
              />
            </Form.Group>
          </div>
          <div className="col-md-4">
            <Form.Group className="mb-3">
              <Form.Label>Prize Pool (Rs.)</Form.Label>
              <Form.Control 
                type="number" 
                name="prizePool" 
                value={formData.prizePool} 
                onChange={handleInputChange} 
                min="0" 
                required 
              />
            </Form.Group>
          </div>
          <div className="col-md-4">
            <Form.Group className="mb-3">
              <Form.Label>Max Participants</Form.Label>
              <Form.Control 
                type="number" 
                name="maxParticipants" 
                value={formData.maxParticipants} 
                onChange={handleInputChange} 
                min="1" 
                required 
              />
            </Form.Group>
          </div>
        </div>
        
        <Form.Group className="mb-3">
          <Form.Label>Match Details (Room ID, Password, etc.)</Form.Label>
          <Form.Control 
            as="textarea" 
            name="matchDetails" 
            value={formData.matchDetails} 
            onChange={handleInputChange} 
            rows={3} 
            placeholder="Provide details about how participants will join the match"
          />
        </Form.Group>
        
        <Form.Group className="mb-3">
          <Form.Label>Rules & Requirements</Form.Label>
          <Form.Control 
            as="textarea" 
            name="rules" 
            value={formData.rules} 
            onChange={handleInputChange} 
            rows={4} 
            placeholder="Specify tournament rules, requirements, and any other important information"
          />
        </Form.Group>
        
        <Form.Group className="mb-4">
          <Form.Check 
            type="checkbox" 
            id="isPrivate"
            name="isPrivate"
            label="This is a private tournament (requires admin approval)"
            checked={formData.isPrivate}
            onChange={handleInputChange}
            disabled={true} // Always private for now
          />
          <Form.Text className="text-muted small">
            All user-created tournaments require admin approval before they become visible to other users.
          </Form.Text>
        </Form.Group>
        
        <div className="d-flex justify-content-end">
          <Button variant="secondary" className="me-2" onClick={() => navigate('/my-tournaments')}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Tournament'}
          </Button>
        </div>
      </Form>
    </Container>
  );
}

export default CreateTournament;