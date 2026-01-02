// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./FunderrCampaign.sol";

/**
 * @title FunderrFactory
 * @dev Factory contract that creates individual campaign contracts
 * @notice Each campaign gets its own contract address visible on Etherscan
 */
contract FunderrFactory {
    // Platform settings
    address public owner;
    address public platformWallet;
    bool public paused;
    
    // Campaign tracking
    uint256 public campaignCount;
    mapping(uint256 => address) public campaigns; // ID => Campaign contract address
    mapping(address => uint256[]) public creatorCampaigns; // Creator => Campaign IDs
    mapping(address => bool) public isCampaignContract; // Quick lookup for valid campaigns
    
    // Events
    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed campaignContract,
        address indexed creator,
        string title,
        uint256 goal,
        uint256 deadline,
        uint256 timestamp
    );
    event CampaignDeactivated(uint256 indexed campaignId, address indexed campaignContract);
    event PlatformWalletUpdated(address indexed oldWallet, address indexed newWallet);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event FactoryPaused(bool paused);
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }
    
    modifier whenNotPaused() {
        require(!paused, "Factory is paused");
        _;
    }
    
    /**
     * @dev Constructor
     */
    constructor() {
        owner = msg.sender;
        platformWallet = msg.sender;
        campaignCount = 0;
        paused = false;
    }
    
    /**
     * @dev Create a new campaign contract
     * @param _creator Address of the campaign creator
     * @param _title Campaign title
     * @param _description Campaign description
     * @param _goal Funding goal in wei
     * @param _durationDays Campaign duration in days
     * @param _imageHash IPFS or URL hash for campaign image
     * @return campaignId The ID of the new campaign
     * @return campaignAddress The address of the new campaign contract
     */
    function createCampaign(
        address _creator,
        string memory _title,
        string memory _description,
        uint256 _goal,
        uint256 _durationDays,
        string memory _imageHash
    ) external onlyOwner whenNotPaused returns (uint256 campaignId, address campaignAddress) {
        require(_creator != address(0), "Invalid creator address");
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(_goal > 0, "Goal must be greater than 0");
        require(_durationDays > 0 && _durationDays <= 365, "Duration must be between 1 and 365 days");
        
        // Create new campaign contract
        FunderrCampaign newCampaign = new FunderrCampaign();
        
        // Initialize the campaign
        newCampaign.initialize(
            _creator,
            _title,
            _description,
            _goal,
            _durationDays,
            _imageHash,
            platformWallet
        );
        
        // Store campaign reference
        campaignId = campaignCount;
        campaignAddress = address(newCampaign);
        campaigns[campaignId] = campaignAddress;
        creatorCampaigns[_creator].push(campaignId);
        isCampaignContract[campaignAddress] = true;
        campaignCount++;
        
        emit CampaignCreated(
            campaignId,
            campaignAddress,
            _creator,
            _title,
            _goal,
            block.timestamp + (_durationDays * 1 days),
            block.timestamp
        );
        
        return (campaignId, campaignAddress);
    }
    
    /**
     * @dev Deactivate a campaign (emergency function)
     */
    function deactivateCampaign(uint256 _campaignId) external onlyOwner {
        require(_campaignId < campaignCount, "Invalid campaign ID");
        address campaignAddress = campaigns[_campaignId];
        FunderrCampaign(campaignAddress).deactivate();
        emit CampaignDeactivated(_campaignId, campaignAddress);
    }
    
    /**
     * @dev Get campaign contract address by ID
     */
    function getCampaignAddress(uint256 _campaignId) external view returns (address) {
        require(_campaignId < campaignCount, "Invalid campaign ID");
        return campaigns[_campaignId];
    }
    
    /**
     * @dev Get campaign details by ID
     */
    function getCampaignDetails(uint256 _campaignId) external view returns (
        address campaignAddress,
        address creator,
        string memory title,
        uint256 goal,
        uint256 raised,
        bool active
    ) {
        require(_campaignId < campaignCount, "Invalid campaign ID");
        campaignAddress = campaigns[_campaignId];
        FunderrCampaign campaign = FunderrCampaign(campaignAddress);
        
        (creator, title, , goal, , raised, , , active, ) = campaign.getCampaignDetails();
        
        return (campaignAddress, creator, title, goal, raised, active);
    }
    
    /**
     * @dev Get all campaign IDs for a creator
     */
    function getCreatorCampaigns(address _creator) external view returns (uint256[] memory) {
        return creatorCampaigns[_creator];
    }
    
    /**
     * @dev Check if an address is a valid campaign contract
     */
    function isValidCampaign(address _campaignAddress) external view returns (bool) {
        return isCampaignContract[_campaignAddress];
    }
    
    /**
     * @dev Get total number of campaigns
     */
    function getTotalCampaigns() external view returns (uint256) {
        return campaignCount;
    }
    
    /**
     * @dev Update platform wallet
     */
    function updatePlatformWallet(address _newWallet) external onlyOwner {
        require(_newWallet != address(0), "Invalid wallet address");
        address oldWallet = platformWallet;
        platformWallet = _newWallet;
        emit PlatformWalletUpdated(oldWallet, _newWallet);
    }
    
    /**
     * @dev Transfer ownership
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner address");
        address previousOwner = owner;
        owner = _newOwner;
        emit OwnershipTransferred(previousOwner, _newOwner);
    }
    
    /**
     * @dev Pause/unpause factory
     */
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit FactoryPaused(_paused);
    }
    
    /**
     * @dev Get factory info
     */
    function getFactoryInfo() external view returns (
        address _owner,
        address _platformWallet,
        uint256 _campaignCount,
        bool _paused
    ) {
        return (owner, platformWallet, campaignCount, paused);
    }
}
