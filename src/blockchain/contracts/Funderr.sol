// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Funderr - Decentralized Crowdfunding Platform
 * @notice Smart contract for creating campaigns, donating ETH, and managing funds
 * @dev Implements secure donation handling with refund mechanism
 */
contract Funderr {
    // ============ Structs ============
    struct Campaign {
        address payable creator;
        string title;
        string description;
        uint256 goal;
        uint256 deadline;
        uint256 raised;
        uint256 donorCount;
        bool withdrawn;
        bool active;
        string imageHash; // IPFS hash for campaign image
    }

    struct Donation {
        address donor;
        uint256 amount;
        uint256 timestamp;
        string message;
    }

    // ============ State Variables ============
    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => uint256)) public donations; // campaignId => donor => total amount
    mapping(uint256 => Donation[]) public campaignDonations; // campaignId => array of donations
    mapping(address => uint256[]) public userCampaigns; // creator => array of campaign IDs
    mapping(address => uint256[]) public userDonations; // donor => array of campaign IDs donated to

    uint256 public campaignCount;
    uint256 public totalDonationsReceived;
    uint256 public platformFeePercent = 2; // 2% platform fee
    address payable public platformWallet;
    address public owner;

    // ============ Events ============
    event CampaignCreated(
        uint256 indexed id, 
        address indexed creator, 
        string title,
        uint256 goal, 
        uint256 deadline
    );
    event DonationReceived(
        uint256 indexed campaignId, 
        address indexed donor, 
        uint256 amount,
        string message,
        uint256 timestamp
    );
    event FundsWithdrawn(uint256 indexed campaignId, address indexed creator, uint256 amount);
    event RefundClaimed(uint256 indexed campaignId, address indexed donor, uint256 amount);
    event CampaignCancelled(uint256 indexed campaignId);
    event CampaignUpdated(uint256 indexed campaignId, string title, string description);
    event DirectDonationReceived(address indexed donor, uint256 amount);

    // ============ Modifiers ============
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    modifier campaignExists(uint256 _id) {
        require(_id > 0 && _id <= campaignCount, "Campaign does not exist");
        _;
    }

    modifier onlyCampaignCreator(uint256 _id) {
        require(msg.sender == campaigns[_id].creator, "Not campaign creator");
        _;
    }

    // ============ Constructor ============
    constructor() {
        owner = msg.sender;
        platformWallet = payable(msg.sender);
    }

    // ============ Receive & Fallback ============
    /**
     * @notice Allows the contract to receive ETH directly
     * @dev ETH sent directly goes to the platform wallet
     */
    receive() external payable {
        require(msg.value > 0, "Must send ETH");
        totalDonationsReceived += msg.value;
        emit DirectDonationReceived(msg.sender, msg.value);
    }

    fallback() external payable {
        require(msg.value > 0, "Must send ETH");
        totalDonationsReceived += msg.value;
        emit DirectDonationReceived(msg.sender, msg.value);
    }

    // ============ Campaign Management ============
    /**
     * @notice Create a new crowdfunding campaign
     * @param _title Campaign title
     * @param _description Campaign description
     * @param _goal Funding goal in wei
     * @param _durationDays Campaign duration in days
     * @param _imageHash IPFS hash for campaign image
     */
    function createCampaign(
        string memory _title,
        string memory _description,
        uint256 _goal,
        uint256 _durationDays,
        string memory _imageHash
    ) external returns (uint256) {
        require(bytes(_title).length > 0, "Title required");
        require(_goal > 0, "Goal must be greater than 0");
        require(_durationDays > 0 && _durationDays <= 365, "Duration: 1-365 days");

        campaignCount++;
        uint256 newCampaignId = campaignCount;
        uint256 deadline = block.timestamp + (_durationDays * 1 days);

        campaigns[newCampaignId] = Campaign({
            creator: payable(msg.sender),
            title: _title,
            description: _description,
            goal: _goal,
            deadline: deadline,
            raised: 0,
            donorCount: 0,
            withdrawn: false,
            active: true,
            imageHash: _imageHash
        });

        userCampaigns[msg.sender].push(newCampaignId);

        emit CampaignCreated(newCampaignId, msg.sender, _title, _goal, deadline);
        return newCampaignId;
    }

    /**
     * @notice Update campaign details (only before any donations)
     * @param _id Campaign ID
     * @param _title New title
     * @param _description New description
     */
    function updateCampaign(
        uint256 _id,
        string memory _title,
        string memory _description
    ) external campaignExists(_id) onlyCampaignCreator(_id) {
        Campaign storage campaign = campaigns[_id];
        require(campaign.raised == 0, "Cannot update after receiving donations");
        require(campaign.active, "Campaign not active");

        campaign.title = _title;
        campaign.description = _description;

        emit CampaignUpdated(_id, _title, _description);
    }

    /**
     * @notice Cancel a campaign (only if no donations received)
     * @param _id Campaign ID
     */
    function cancelCampaign(uint256 _id) 
        external 
        campaignExists(_id) 
        onlyCampaignCreator(_id) 
    {
        Campaign storage campaign = campaigns[_id];
        require(campaign.active, "Campaign already inactive");
        require(campaign.raised == 0, "Cannot cancel: donations received");

        campaign.active = false;
        emit CampaignCancelled(_id);
    }

    // ============ Donation Functions ============
    /**
     * @notice Donate ETH to a specific campaign
     * @param _id Campaign ID to donate to
     * @param _message Optional message from donor
     */
    function donate(uint256 _id, string memory _message) 
        external 
        payable 
        campaignExists(_id) 
    {
        Campaign storage campaign = campaigns[_id];

        require(campaign.active, "Campaign is not active");
        require(block.timestamp < campaign.deadline, "Campaign has ended");
        require(msg.value > 0, "Must send ETH to donate");

        // Track if this is a new donor
        if (donations[_id][msg.sender] == 0) {
            campaign.donorCount++;
            userDonations[msg.sender].push(_id);
        }

        // Update totals
        campaign.raised += msg.value;
        donations[_id][msg.sender] += msg.value;
        totalDonationsReceived += msg.value;

        // Record donation details
        campaignDonations[_id].push(Donation({
            donor: msg.sender,
            amount: msg.value,
            timestamp: block.timestamp,
            message: _message
        }));

        emit DonationReceived(_id, msg.sender, msg.value, _message, block.timestamp);
    }

    /**
     * @notice Donate ETH to a campaign (simple version without message)
     * @param _id Campaign ID to donate to
     */
    function donateSimple(uint256 _id) external payable campaignExists(_id) {
        Campaign storage campaign = campaigns[_id];

        require(campaign.active, "Campaign is not active");
        require(block.timestamp < campaign.deadline, "Campaign has ended");
        require(msg.value > 0, "Must send ETH to donate");

        if (donations[_id][msg.sender] == 0) {
            campaign.donorCount++;
            userDonations[msg.sender].push(_id);
        }

        campaign.raised += msg.value;
        donations[_id][msg.sender] += msg.value;
        totalDonationsReceived += msg.value;

        campaignDonations[_id].push(Donation({
            donor: msg.sender,
            amount: msg.value,
            timestamp: block.timestamp,
            message: ""
        }));

        emit DonationReceived(_id, msg.sender, msg.value, "", block.timestamp);
    }

    // ============ Withdrawal Functions ============
    /**
     * @notice Creator withdraws funds after goal is reached
     * @param _id Campaign ID
     */
    function withdraw(uint256 _id) 
        external 
        campaignExists(_id) 
        onlyCampaignCreator(_id) 
    {
        Campaign storage campaign = campaigns[_id];

        require(campaign.raised >= campaign.goal, "Funding goal not reached");
        require(!campaign.withdrawn, "Funds already withdrawn");
        require(campaign.raised > 0, "No funds to withdraw");

        campaign.withdrawn = true;
        campaign.active = false;

        // Calculate platform fee
        uint256 platformFee = (campaign.raised * platformFeePercent) / 100;
        uint256 creatorAmount = campaign.raised - platformFee;

        // Transfer funds
        if (platformFee > 0) {
            platformWallet.transfer(platformFee);
        }
        campaign.creator.transfer(creatorAmount);

        emit FundsWithdrawn(_id, msg.sender, creatorAmount);
    }

    /**
     * @notice Creator can withdraw partial funds after deadline (even if goal not met)
     * @param _id Campaign ID
     */
    function withdrawAfterDeadline(uint256 _id) 
        external 
        campaignExists(_id) 
        onlyCampaignCreator(_id) 
    {
        Campaign storage campaign = campaigns[_id];

        require(block.timestamp >= campaign.deadline, "Campaign still active");
        require(!campaign.withdrawn, "Funds already withdrawn");
        require(campaign.raised > 0, "No funds to withdraw");

        campaign.withdrawn = true;
        campaign.active = false;

        uint256 platformFee = (campaign.raised * platformFeePercent) / 100;
        uint256 creatorAmount = campaign.raised - platformFee;

        if (platformFee > 0) {
            platformWallet.transfer(platformFee);
        }
        campaign.creator.transfer(creatorAmount);

        emit FundsWithdrawn(_id, msg.sender, creatorAmount);
    }

    /**
     * @notice Donor claims refund if goal not reached after deadline
     * @param _id Campaign ID
     */
    function claimRefund(uint256 _id) external campaignExists(_id) {
        Campaign storage campaign = campaigns[_id];

        require(block.timestamp >= campaign.deadline, "Campaign has not ended yet");
        require(campaign.raised < campaign.goal, "Goal was reached, no refunds");
        require(!campaign.withdrawn, "Funds already withdrawn by creator");

        uint256 donatedAmount = donations[_id][msg.sender];
        require(donatedAmount > 0, "You have no donations to refund");

        // Reset donor's contribution
        donations[_id][msg.sender] = 0;
        campaign.raised -= donatedAmount;

        // Transfer refund
        payable(msg.sender).transfer(donatedAmount);

        emit RefundClaimed(_id, msg.sender, donatedAmount);
    }

    // ============ View Functions ============
    /**
     * @notice Get full campaign details
     * @param _id Campaign ID
     */
    function getCampaign(uint256 _id)
        external
        view
        campaignExists(_id)
        returns (
            address creator,
            string memory title,
            string memory description,
            uint256 goal,
            uint256 deadline,
            uint256 raised,
            uint256 donorCount,
            bool withdrawn,
            bool active,
            string memory imageHash
        )
    {
        Campaign memory c = campaigns[_id];
        return (
            c.creator,
            c.title,
            c.description,
            c.goal,
            c.deadline,
            c.raised,
            c.donorCount,
            c.withdrawn,
            c.active,
            c.imageHash
        );
    }

    /**
     * @notice Get campaign funding progress percentage
     * @param _id Campaign ID
     */
    function getCampaignProgress(uint256 _id) 
        external 
        view 
        campaignExists(_id) 
        returns (uint256) 
    {
        Campaign memory c = campaigns[_id];
        if (c.goal == 0) return 0;
        return (c.raised * 100) / c.goal;
    }

    /**
     * @notice Get time remaining for a campaign
     * @param _id Campaign ID
     */
    function getTimeRemaining(uint256 _id) 
        external 
        view 
        campaignExists(_id) 
        returns (uint256) 
    {
        Campaign memory c = campaigns[_id];
        if (block.timestamp >= c.deadline) return 0;
        return c.deadline - block.timestamp;
    }

    /**
     * @notice Get all donations for a campaign
     * @param _id Campaign ID
     */
    function getCampaignDonations(uint256 _id) 
        external 
        view 
        campaignExists(_id) 
        returns (Donation[] memory) 
    {
        return campaignDonations[_id];
    }

    /**
     * @notice Get donation amount by a specific donor for a campaign
     * @param _id Campaign ID
     * @param _donor Donor address
     */
    function getDonationAmount(uint256 _id, address _donor) 
        external 
        view 
        campaignExists(_id) 
        returns (uint256) 
    {
        return donations[_id][_donor];
    }

    /**
     * @notice Get all campaign IDs created by a user
     * @param _user User address
     */
    function getUserCampaigns(address _user) external view returns (uint256[] memory) {
        return userCampaigns[_user];
    }

    /**
     * @notice Get all campaign IDs a user has donated to
     * @param _user User address
     */
    function getUserDonatedCampaigns(address _user) external view returns (uint256[] memory) {
        return userDonations[_user];
    }

    /**
     * @notice Get total number of campaigns
     */
    function getTotalCampaigns() external view returns (uint256) {
        return campaignCount;
    }

    /**
     * @notice Get contract balance
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @notice Check if campaign is still active for donations
     * @param _id Campaign ID
     */
    function isCampaignActive(uint256 _id) 
        external 
        view 
        campaignExists(_id) 
        returns (bool) 
    {
        Campaign memory c = campaigns[_id];
        return c.active && block.timestamp < c.deadline && !c.withdrawn;
    }

    // ============ Admin Functions ============
    /**
     * @notice Update platform fee percentage (max 5%)
     * @param _newFee New fee percentage
     */
    function setPlatformFee(uint256 _newFee) external onlyOwner {
        require(_newFee <= 5, "Fee cannot exceed 5%");
        platformFeePercent = _newFee;
    }

    /**
     * @notice Update platform wallet address
     * @param _newWallet New wallet address
     */
    function setPlatformWallet(address payable _newWallet) external onlyOwner {
        require(_newWallet != address(0), "Invalid address");
        platformWallet = _newWallet;
    }

    /**
     * @notice Transfer ownership
     * @param _newOwner New owner address
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid address");
        owner = _newOwner;
    }

    /**
     * @notice Withdraw platform fees accumulated from direct donations
     */
    function withdrawPlatformFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        platformWallet.transfer(balance);
    }
}
