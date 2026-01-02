// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title FunderrCampaign
 * @dev Individual campaign contract - each campaign gets its own contract
 * @notice This contract handles a single crowdfunding campaign
 */
contract FunderrCampaign {
    // Campaign state
    address public creator;
    address public factory;
    string public title;
    string public description;
    string public imageHash;
    uint256 public goal;
    uint256 public deadline;
    uint256 public raised;
    uint256 public donorCount;
    bool public withdrawn;
    bool public active;
    
    // Platform settings
    address public platformWallet;
    uint256 public constant PLATFORM_FEE_PERCENT = 2;
    
    // Donor tracking
    mapping(address => uint256) public donations;
    address[] public donors;
    
    // Donation record structure
    struct DonationRecord {
        address donor;
        uint256 amount;
        string message;
        uint256 timestamp;
    }
    DonationRecord[] public donationHistory;
    
    // Events
    event DonationReceived(
        address indexed donor,
        uint256 amount,
        string message,
        uint256 timestamp
    );
    event FundsWithdrawn(
        address indexed creator,
        uint256 amount,
        uint256 platformFee,
        uint256 timestamp
    );
    event RefundClaimed(
        address indexed donor,
        uint256 amount,
        uint256 timestamp
    );
    event CampaignStatusChanged(bool active);
    
    // Modifiers
    modifier onlyCreator() {
        require(msg.sender == creator, "Only campaign creator can call this");
        _;
    }
    
    modifier onlyFactory() {
        require(msg.sender == factory, "Only factory can call this");
        _;
    }
    
    modifier campaignActive() {
        require(active, "Campaign is not active");
        require(block.timestamp < deadline, "Campaign has ended");
        _;
    }
    
    modifier notCreator() {
        require(msg.sender != creator, "Campaign creator cannot donate to own campaign");
        _;
    }
    
    /**
     * @dev Initialize the campaign (called by factory)
     */
    function initialize(
        address _creator,
        string memory _title,
        string memory _description,
        uint256 _goal,
        uint256 _durationDays,
        string memory _imageHash,
        address _platformWallet
    ) external {
        require(creator == address(0), "Already initialized");
        require(_creator != address(0), "Invalid creator address");
        require(_goal > 0, "Goal must be greater than 0");
        require(_durationDays > 0, "Duration must be greater than 0");
        
        factory = msg.sender;
        creator = _creator;
        title = _title;
        description = _description;
        goal = _goal;
        deadline = block.timestamp + (_durationDays * 1 days);
        imageHash = _imageHash;
        platformWallet = _platformWallet;
        active = true;
    }
    
    /**
     * @dev Donate to the campaign
     * @notice Creator cannot donate to their own campaign
     */
    function donate(string memory _message) external payable campaignActive notCreator {
        require(msg.value > 0, "Donation must be greater than 0");
        
        if (donations[msg.sender] == 0) {
            donors.push(msg.sender);
            donorCount++;
        }
        
        donations[msg.sender] += msg.value;
        raised += msg.value;
        
        donationHistory.push(DonationRecord({
            donor: msg.sender,
            amount: msg.value,
            message: _message,
            timestamp: block.timestamp
        }));
        
        emit DonationReceived(msg.sender, msg.value, _message, block.timestamp);
    }
    
    /**
     * @dev Simple donate without message
     * @notice Creator cannot donate to their own campaign
     */
    function donateSimple() external payable campaignActive notCreator {
        require(msg.value > 0, "Donation must be greater than 0");
        
        if (donations[msg.sender] == 0) {
            donors.push(msg.sender);
            donorCount++;
        }
        
        donations[msg.sender] += msg.value;
        raised += msg.value;
        
        donationHistory.push(DonationRecord({
            donor: msg.sender,
            amount: msg.value,
            message: "",
            timestamp: block.timestamp
        }));
        
        emit DonationReceived(msg.sender, msg.value, "", block.timestamp);
    }
    
    /**
     * @dev Withdraw funds after campaign succeeds
     */
    function withdraw() external onlyCreator {
        require(!withdrawn, "Funds already withdrawn");
        require(raised >= goal || block.timestamp >= deadline, "Campaign still active and goal not reached");
        require(raised > 0, "No funds to withdraw");
        
        withdrawn = true;
        active = false;
        
        uint256 platformFee = (raised * PLATFORM_FEE_PERCENT) / 100;
        uint256 creatorAmount = raised - platformFee;
        
        // Transfer platform fee
        (bool feeSuccess, ) = platformWallet.call{value: platformFee}("");
        require(feeSuccess, "Platform fee transfer failed");
        
        // Transfer to creator
        (bool success, ) = creator.call{value: creatorAmount}("");
        require(success, "Creator transfer failed");
        
        emit FundsWithdrawn(creator, creatorAmount, platformFee, block.timestamp);
    }
    
    /**
     * @dev Claim refund if campaign failed
     */
    function claimRefund() external {
        require(block.timestamp >= deadline, "Campaign still active");
        require(raised < goal, "Campaign reached goal, no refunds");
        require(donations[msg.sender] > 0, "No donation to refund");
        
        uint256 amount = donations[msg.sender];
        donations[msg.sender] = 0;
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Refund transfer failed");
        
        emit RefundClaimed(msg.sender, amount, block.timestamp);
    }
    
    /**
     * @dev Deactivate campaign (emergency)
     */
    function deactivate() external onlyFactory {
        active = false;
        emit CampaignStatusChanged(false);
    }
    
    /**
     * @dev Get campaign details
     */
    function getCampaignDetails() external view returns (
        address _creator,
        string memory _title,
        string memory _description,
        uint256 _goal,
        uint256 _deadline,
        uint256 _raised,
        uint256 _donorCount,
        bool _withdrawn,
        bool _active,
        string memory _imageHash
    ) {
        return (
            creator,
            title,
            description,
            goal,
            deadline,
            raised,
            donorCount,
            withdrawn,
            active,
            imageHash
        );
    }
    
    /**
     * @dev Get campaign progress percentage
     */
    function getProgress() external view returns (uint256) {
        if (goal == 0) return 0;
        return (raised * 100) / goal;
    }
    
    /**
     * @dev Get time remaining in seconds
     */
    function getTimeRemaining() external view returns (uint256) {
        if (block.timestamp >= deadline) return 0;
        return deadline - block.timestamp;
    }
    
    /**
     * @dev Check if donor can get refund
     */
    function canClaimRefund(address _donor) external view returns (bool) {
        return block.timestamp >= deadline && 
               raised < goal && 
               donations[_donor] > 0;
    }
    
    /**
     * @dev Get donation amount for a donor
     */
    function getDonationAmount(address _donor) external view returns (uint256) {
        return donations[_donor];
    }
    
    /**
     * @dev Get all donors
     */
    function getAllDonors() external view returns (address[] memory) {
        return donors;
    }
    
    /**
     * @dev Get donation history count
     */
    function getDonationHistoryCount() external view returns (uint256) {
        return donationHistory.length;
    }
    
    /**
     * @dev Get donation history entry
     */
    function getDonationHistoryEntry(uint256 _index) external view returns (
        address donor,
        uint256 amount,
        string memory message,
        uint256 timestamp
    ) {
        require(_index < donationHistory.length, "Index out of bounds");
        DonationRecord memory record = donationHistory[_index];
        return (record.donor, record.amount, record.message, record.timestamp);
    }
    
    /**
     * @dev Get contract balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Check if address is the creator
     */
    function isCreator(address _address) external view returns (bool) {
        return _address == creator;
    }
}
